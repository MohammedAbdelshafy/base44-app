"""
Health monitoring Celery task.
"""
from app.core.celery_app import celery_app
from app.core.logging_config import get_logger
from app.workers.campaign_tasks import JobTrackedTask

logger = get_logger("workers.health")


@celery_app.task(
    name="app.workers.health_tasks.run_health_check",
    queue="health",
)
def run_health_check():
    from app.core.database import SyncSessionLocal
    from app.agents.health_monitor import HealthMonitorAgent

    db = SyncSessionLocal()
    try:
        agent = HealthMonitorAgent(db=db)
        result = agent._safe_run()
        db.commit()
        return result.data
    finally:
        db.close()


@celery_app.task(
    name="app.workers.health_tasks.aggregate_analytics",
    queue="health",
)
def aggregate_analytics():
    from app.core.database import SyncSessionLocal
    from app.services.analytics_service import AnalyticsService

    db = SyncSessionLocal()
    try:
        svc = AnalyticsService(db)
        svc.aggregate_today()
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()
