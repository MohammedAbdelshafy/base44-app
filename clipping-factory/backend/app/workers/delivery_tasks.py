"""
Delivery Celery tasks — deliverable creation, upload, outcome polling.
"""
from celery.exceptions import MaxRetriesExceededError

from app.core.celery_app import celery_app
from app.core.logging_config import get_logger
from app.workers.campaign_tasks import JobTrackedTask

logger = get_logger("workers.delivery")


@celery_app.task(
    name="app.workers.delivery_tasks.create_deliverable",
    base=JobTrackedTask,
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="delivery",
)
def create_deliverable(self, clip_id: str):
    from app.core.database import SyncSessionLocal
    from app.agents.delivery_agent import DeliveryAgent

    db = SyncSessionLocal()
    try:
        agent = DeliveryAgent(db=db)
        result = agent._safe_run(clip_id=clip_id)
        if not result.success:
            raise ValueError(result.error)
        db.commit()

        # Optionally fan out to social platforms after a successful delivery.
        from app.core.config import get_settings
        if get_settings().auto_publish:
            from app.workers.publish_tasks import publish_clip
            publish_clip.apply_async(args=[clip_id], queue="publish")
            logger.info(f"auto_publish: queued social publish for clip {clip_id}")

        return result.data
    except Exception as exc:
        db.rollback()
        logger.error(f"Delivery failed for clip {clip_id}: {exc}")
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            return {"error": str(exc)}
    finally:
        db.close()


@celery_app.task(
    name="app.workers.delivery_tasks.poll_outcomes",
    base=JobTrackedTask,
    queue="delivery",
)
def poll_outcomes():
    """Periodically check Clipping.com for submission outcomes."""
    from app.core.database import SyncSessionLocal
    from app.agents.delivery_agent import OutcomePollerAgent

    db = SyncSessionLocal()
    try:
        agent = OutcomePollerAgent(db=db)
        result = agent._safe_run()
        db.commit()
        return result.data
    finally:
        db.close()
