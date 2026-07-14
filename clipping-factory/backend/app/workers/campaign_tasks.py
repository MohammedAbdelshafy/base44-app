"""
Campaign Celery tasks — discovery and intelligence pipeline.
All tasks follow the pattern: create Job record → run agent → update Job.
"""
import traceback
from datetime import datetime, timezone

from celery import Task
from celery.exceptions import MaxRetriesExceededError

from app.core.celery_app import celery_app
from app.core.logging_config import get_logger

logger = get_logger("workers.campaigns")


class JobTrackedTask(Task):
    """Base Celery task that creates and updates a Job record."""

    abstract = True

    def _get_db(self):
        from app.core.database import SyncSessionLocal
        return SyncSessionLocal()

    def before_start(self, task_id, args, kwargs):
        db = self._get_db()
        try:
            from app.models.job import Job, JobStatus
            job = Job(
                celery_task_id=task_id,
                task_name=self.name,
                status=JobStatus.RUNNING,
                input_args={"args": args, "kwargs": kwargs},
                started_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(job)
            db.commit()
        finally:
            db.close()

    def on_success(self, retval, task_id, args, kwargs):
        db = self._get_db()
        try:
            from app.models.job import Job, JobStatus
            job = db.query(Job).filter(Job.celery_task_id == task_id).first()
            if job:
                now = datetime.now(timezone.utc).isoformat()
                job.status = JobStatus.SUCCESS
                job.result = retval if isinstance(retval, dict) else {"result": str(retval)}
                job.finished_at = now
                job.progress = 100
                db.commit()
        finally:
            db.close()

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        db = self._get_db()
        try:
            from app.models.job import Job, JobStatus
            from app.core.redis_client import push_to_dlq
            job = db.query(Job).filter(Job.celery_task_id == task_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(exc)
                job.error_traceback = str(einfo)
                job.finished_at = datetime.now(timezone.utc).isoformat()
                db.commit()
            # Push to dead-letter queue for manual inspection
            push_to_dlq(self.name, {"args": args, "kwargs": kwargs}, str(exc))
        finally:
            db.close()


@celery_app.task(
    name="app.workers.campaign_tasks.scan_for_campaigns",
    base=JobTrackedTask,
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="campaigns",
)
def scan_for_campaigns(self, page_id: str | None = None):
    """Periodic task: scan Clipping.com for new campaigns."""
    from app.core.database import SyncSessionLocal
    from app.agents.campaign_hunter import CampaignHunterAgent

    db = SyncSessionLocal()
    try:
        agent = CampaignHunterAgent(db=db)
        result = agent._safe_run(page_id=page_id)
        db.commit()
        logger.info(f"Scan complete: {result.data}")
        return result.data
    except Exception as exc:
        db.rollback()
        logger.error(f"Campaign scan failed: {exc}")
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for campaign scan")
            return {"error": str(exc)}
    finally:
        db.close()


@celery_app.task(
    name="app.workers.campaign_tasks.analyze_campaign",
    base=JobTrackedTask,
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue="campaigns",
)
def analyze_campaign(self, campaign_id: str):
    """Parse campaign requirements with Campaign Intelligence Agent."""
    from app.core.database import SyncSessionLocal
    from app.agents.campaign_intelligence import CampaignIntelligenceAgent

    db = SyncSessionLocal()
    try:
        agent = CampaignIntelligenceAgent(db=db)
        result = agent._safe_run(campaign_id=campaign_id)
        if not result.success:
            raise ValueError(result.error)
        db.commit()
        return result.data
    except Exception as exc:
        db.rollback()
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            from app.models.campaign import Campaign, CampaignStatus
            db2 = SyncSessionLocal()
            try:
                c = db2.query(Campaign).filter(Campaign.id == campaign_id).first()
                if c:
                    c.status = CampaignStatus.FAILED
                    c.error_message = str(exc)
                    db2.commit()
            finally:
                db2.close()
            return {"error": str(exc)}
    finally:
        db.close()
