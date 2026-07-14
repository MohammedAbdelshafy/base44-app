"""
Ingestion Celery tasks — ingest leads from various sources and create campaigns.
These tasks bridge the gap between lead generation and the clipping pipeline.
"""

from app.core.celery_app import celery_app
from app.core.logging_config import get_logger
from app.workers.campaign_tasks import JobTrackedTask

logger = get_logger("workers.ingestion")


@celery_app.task(
    name="app.workers.ingestion_tasks.ingest_lead_packs",
    base=JobTrackedTask,
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    queue="campaigns",
    soft_time_limit=600,
)
def ingest_lead_packs(self, date_str: str | None = None, max_campaigns: int = 10):
    from app.core.database import SyncSessionLocal
    from app.agents.lead_ingestion import LeadIngestionAgent

    db = SyncSessionLocal()
    try:
        agent = LeadIngestionAgent(db=db)
        result = agent._safe_run(source="mbm_leadpacks", date_str=date_str, max_campaigns=max_campaigns)
        if not result.success:
            raise ValueError(result.error)
        db.commit()
        return result.data
    except Exception as exc:
        db.rollback()
        logger.error(f"Lead pack ingestion failed: {exc}")
        return {"error": str(exc)}
    finally:
        db.close()


@celery_app.task(
    name="app.workers.ingestion_tasks.ingest_mbm_social_leads",
    base=JobTrackedTask,
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    queue="campaigns",
    soft_time_limit=600,
)
def ingest_mbm_social_leads(self, max_campaigns: int = 10):
    from app.core.database import SyncSessionLocal
    from app.agents.lead_ingestion import LeadIngestionAgent

    db = SyncSessionLocal()
    try:
        agent = LeadIngestionAgent(db=db)
        result = agent._safe_run(source="mbm_social_leads", max_campaigns=max_campaigns)
        if not result.success:
            raise ValueError(result.error)
        db.commit()
        return result.data
    except Exception as exc:
        db.rollback()
        logger.error(f"MBM-Social lead ingestion failed: {exc}")
        return {"error": str(exc)}
    finally:
        db.close()


@celery_app.task(
    name="app.workers.ingestion_tasks.ingest_all_leads",
    base=JobTrackedTask,
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    queue="campaigns",
    soft_time_limit=600,
)
def ingest_all_leads(self, date_str: str | None = None, max_campaigns: int = 20):
    from app.core.database import SyncSessionLocal
    from app.agents.lead_ingestion import LeadIngestionAgent

    db = SyncSessionLocal()
    try:
        agent = LeadIngestionAgent(db=db)
        result = agent._safe_run(source="all", date_str=date_str, max_campaigns=max_campaigns)
        if not result.success:
            raise ValueError(result.error)
        db.commit()
        return result.data
    except Exception as exc:
        db.rollback()
        logger.error(f"Lead ingestion failed: {exc}")
        return {"error": str(exc)}
    finally:
        db.close()
