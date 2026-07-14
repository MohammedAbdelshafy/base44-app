"""
HealthMonitorAgent — checks the health of every system component.

Runs every 60 seconds via Celery Beat. Writes to health_checks table.
Fires alerts via webhook or email when thresholds are crossed.
Publishes real-time status to Redis pub/sub for the dashboard.
"""
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.agents.base_agent import AgentResult, BaseAgent


class HealthMonitorAgent(BaseAgent):
    name = "health_monitor"

    def run(self) -> AgentResult:
        from app.models.analytics import HealthCheck

        self.logger.debug("Running health check")
        checks: dict[str, Any] = {}
        alerts = []

        # Check each service
        checks["postgres"] = self._check_postgres()
        checks["redis"] = self._check_redis()
        checks["minio"] = self._check_minio()
        checks["celery_workers"] = self._check_celery_workers()
        checks["queue_depths"] = self._check_queue_depths()
        checks["failed_tasks_last_hour"] = self._check_failed_tasks()
        checks["dlq_size"] = self._check_dlq()
        checks["system"] = self._check_system_resources()

        # Generate alerts
        alerts.extend(self._evaluate_alerts(checks))

        # Determine overall status
        critical_services = ["postgres", "redis"]
        if any(checks.get(s) == "down" for s in critical_services):
            overall = "critical"
        elif any(
            v in ("down", "degraded") if isinstance(v, str) else False
            for v in checks.values()
        ):
            overall = "degraded"
        else:
            overall = "healthy"

        # Persist health check
        hc = HealthCheck(
            status=overall,
            services=checks,
            cpu_percent=checks.get("system", {}).get("cpu"),
            memory_percent=checks.get("system", {}).get("memory"),
            disk_percent=checks.get("system", {}).get("disk"),
            alerts=alerts,
        )
        self.db.add(hc)
        self.db.flush()

        # Publish to Redis for dashboard real-time updates
        from app.core.redis_client import publish_event
        publish_event("health", {
            "status": overall,
            "checks": checks,
            "alerts": alerts,
            "ts": datetime.now(timezone.utc).isoformat(),
        })

        # Fire external alerts
        for alert in alerts:
            self._send_alert(alert)

        return AgentResult.ok({"status": overall, "alerts": len(alerts)})

    # ------------------------------------------------------------------
    # Individual checks
    # ------------------------------------------------------------------

    def _check_postgres(self) -> str:
        try:
            from app.core.database import sync_engine
            with sync_engine.connect() as conn:
                conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            return "up"
        except Exception as exc:
            self.logger.error(f"PostgreSQL health check failed: {exc}")
            return "down"

    def _check_redis(self) -> str:
        try:
            from app.core.redis_client import get_redis
            r = get_redis()
            r.ping()
            return "up"
        except Exception as exc:
            self.logger.error(f"Redis health check failed: {exc}")
            return "down"

    def _check_minio(self) -> str:
        try:
            from app.core.storage import get_storage_client
            client = get_storage_client()
            client.list_buckets()
            return "up"
        except Exception as exc:
            self.logger.warning(f"MinIO health check failed: {exc}")
            return "down"

    def _check_celery_workers(self) -> dict:
        try:
            from app.core.celery_app import celery_app
            inspect = celery_app.control.inspect(timeout=3)
            active = inspect.active()
            if not active:
                return {}
            workers = {}
            for worker_name, tasks in active.items():
                queue = worker_name.split("@")[0] if "@" in worker_name else "default"
                workers[queue] = workers.get(queue, 0) + 1
            return workers
        except Exception:
            return {}

    def _check_queue_depths(self) -> dict:
        try:
            from app.core.redis_client import get_redis
            r = get_redis()
            queues = ["campaigns", "acquisition", "analysis", "video", "delivery", "default"]
            depths = {}
            for q in queues:
                depths[q] = r.llen(q) + r.llen(f"celery.{q}")
            return depths
        except Exception:
            return {}

    def _check_failed_tasks(self) -> int:
        try:
            from app.models.job import Job, JobStatus
            from datetime import timedelta
            cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
            return (
                self.db.query(Job)
                .filter(Job.status == JobStatus.FAILED, Job.created_at >= cutoff)
                .count()
            )
        except Exception:
            return -1

    def _check_dlq(self) -> int:
        try:
            from app.core.redis_client import get_redis
            return get_redis().llen("dlq:failed_tasks")
        except Exception:
            return -1

    def _check_system_resources(self) -> dict:
        try:
            import psutil
            return {
                "cpu": psutil.cpu_percent(interval=1),
                "memory": psutil.virtual_memory().percent,
                "disk": psutil.disk_usage("/").percent,
            }
        except ImportError:
            return {}
        except Exception:
            return {}

    # ------------------------------------------------------------------
    # Alert evaluation
    # ------------------------------------------------------------------

    def _evaluate_alerts(self, checks: dict) -> list[dict]:
        alerts = []

        if checks.get("postgres") == "down":
            alerts.append({"level": "critical", "service": "postgres", "message": "PostgreSQL is DOWN"})

        if checks.get("redis") == "down":
            alerts.append({"level": "critical", "service": "redis", "message": "Redis is DOWN"})

        if checks.get("minio") == "down":
            alerts.append({"level": "warning", "service": "minio", "message": "MinIO/Storage is unreachable"})

        queue_depths = checks.get("queue_depths", {})
        for queue, depth in queue_depths.items():
            if depth > 50:
                alerts.append({"level": "warning", "service": f"queue.{queue}", "message": f"Queue {queue} depth={depth}"})

        failed = checks.get("failed_tasks_last_hour", 0)
        if failed > 10:
            alerts.append({"level": "warning", "service": "tasks", "message": f"{failed} tasks failed in last hour"})

        dlq = checks.get("dlq_size", 0)
        if dlq > 5:
            alerts.append({"level": "warning", "service": "dlq", "message": f"{dlq} tasks in dead-letter queue"})

        system = checks.get("system", {})
        if system.get("memory", 0) > 90:
            alerts.append({"level": "warning", "service": "system", "message": f"Memory at {system['memory']}%"})
        if system.get("disk", 0) > 85:
            alerts.append({"level": "warning", "service": "system", "message": f"Disk at {system['disk']}%"})

        return alerts

    # ------------------------------------------------------------------
    # Alert dispatch
    # ------------------------------------------------------------------

    def _send_alert(self, alert: dict) -> None:
        if not self.settings.alert_webhook_url:
            return
        try:
            import requests
            payload = {
                "text": f"[{alert['level'].upper()}] {alert['service']}: {alert['message']}",
                "attachments": [{"color": "danger" if alert["level"] == "critical" else "warning"}],
            }
            requests.post(self.settings.alert_webhook_url, json=payload, timeout=5)
        except Exception as exc:
            self.logger.debug(f"Failed to send webhook alert: {exc}")
