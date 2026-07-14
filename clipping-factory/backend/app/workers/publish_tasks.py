"""
Publishing Celery tasks — publish a finished clip to social platforms
(TikTok / Instagram / YouTube) via browser automation.
"""
from celery.exceptions import MaxRetriesExceededError

from app.core.celery_app import celery_app
from app.core.logging_config import get_logger
from app.workers.campaign_tasks import JobTrackedTask

logger = get_logger("workers.publish")


@celery_app.task(
    name="app.workers.publish_tasks.publish_clip",
    base=JobTrackedTask,
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    queue="publish",
    soft_time_limit=1800,
)
def publish_clip(self, clip_id: str, platforms: list[str] | None = None):
    from app.core.database import SyncSessionLocal
    from app.agents.publishing import PublishingAgent

    db = SyncSessionLocal()
    try:
        agent = PublishingAgent(db=db)
        result = agent._safe_run(clip_id=clip_id, platforms=platforms)
        if not result.success:
            raise ValueError(result.error)
        db.commit()
        return result.data
    except Exception as exc:
        db.rollback()
        logger.error(f"Publishing failed for clip {clip_id}: {exc}")
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            return {"error": str(exc)}
    finally:
        db.close()
