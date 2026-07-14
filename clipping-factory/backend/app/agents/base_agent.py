"""
BaseAgent — all agents inherit from this.
Provides: logging, DB session, config access, audit logging, error handling,
          and retry-with-backoff for transient infrastructure failures.
"""
import time
import random
import traceback
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.logging_config import get_logger


class AgentResult:
    def __init__(self, success: bool, data: Any = None, error: str | None = None):
        self.success = success
        self.data = data
        self.error = error

    @classmethod
    def ok(cls, data: Any = None) -> "AgentResult":
        return cls(success=True, data=data)

    @classmethod
    def fail(cls, error: str) -> "AgentResult":
        return cls(success=False, error=error)

    def __repr__(self) -> str:
        if self.success:
            return f"<AgentResult OK data={str(self.data)[:80]}>"
        return f"<AgentResult FAIL error={self.error}>"


class BaseAgent:
    name: str = "base_agent"

    def __init__(self, db: Session | None = None):
        self.db = db
        self.settings: Settings = get_settings()
        self.logger = get_logger(f"agent.{self.name}")
        self._start_time: datetime | None = None

    def run(self, *args, **kwargs) -> AgentResult:
        raise NotImplementedError

    def health_check(self) -> dict:
        return {"agent": self.name, "status": "ok", "ts": datetime.now(timezone.utc).isoformat()}

    def _audit(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        old_value: str | None = None,
        new_value: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Write an immutable audit log entry."""
        if self.db is None:
            return
        from app.models.audit_log import AuditLog
        log = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=self.name,
            old_value=old_value,
            new_value=new_value,
            metadata_json=metadata or {},
        )
        self.db.add(log)
        self.db.flush()

    def _update_job_progress(self, job_id: str, progress: int, message: str) -> None:
        if self.db is None:
            return
        from app.models.job import Job
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.progress = progress
            job.progress_message = message
            self.db.flush()

    def _safe_run(self, *args, **kwargs) -> AgentResult:
        """Wraps run() with exception handling and timing."""
        self._start_time = datetime.now(timezone.utc)
        try:
            return self.run(*args, **kwargs)
        except Exception as exc:
            tb = traceback.format_exc()
            self.logger.error(f"[{self.name}] Unhandled exception: {exc}\n{tb}")
            return AgentResult.fail(f"{type(exc).__name__}: {exc}")

    def _safe_run_with_retry(
        self,
        *args,
        max_attempts: int = 3,
        base_delay: float = 2.0,
        **kwargs,
    ) -> AgentResult:
        """
        Like _safe_run but retries on transient failures (network, DB lock,
        rate limits). Non-retryable logic errors propagate immediately.
        """
        _RETRYABLE_TYPES = (
            "ConnectionError", "TimeoutError", "OperationalError",
            "RateLimitError", "ServiceUnavailableError", "APIStatusError",
        )
        for attempt in range(1, max_attempts + 1):
            result = self._safe_run(*args, **kwargs)
            if result.success:
                return result
            if attempt < max_attempts and any(
                t in (result.error or "") for t in _RETRYABLE_TYPES
            ):
                delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
                self.logger.warning(
                    f"[{self.name}] Retryable failure (attempt {attempt}/{max_attempts}), "
                    f"retrying in {delay:.1f}s: {result.error}"
                )
                time.sleep(delay)
                continue
            return result
        return result  # type: ignore[return-value]
