"""
AnalyticsService — aggregates and returns dashboard metrics.
"""
from datetime import date, datetime, timezone, timedelta
from typing import Any

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.logging_config import get_logger

logger = get_logger("services.analytics")


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_summary(self) -> dict[str, Any]:
        from app.models.campaign import Campaign, CampaignStatus
        from app.models.clip import Clip, ClipStatus
        from app.models.submission import Submission
        from app.models.job import Job, JobStatus

        today = date.today().isoformat()
        week_ago = (date.today() - timedelta(days=7)).isoformat()

        # Campaign counts
        total_campaigns = self.db.query(func.count(Campaign.id)).scalar() or 0
        active_campaigns = self.db.query(func.count(Campaign.id)).filter(
            Campaign.status.in_([CampaignStatus.PROCESSING, CampaignStatus.READY, CampaignStatus.DELIVERING])
        ).scalar() or 0
        completed_campaigns = self.db.query(func.count(Campaign.id)).filter(
            Campaign.status == CampaignStatus.COMPLETED
        ).scalar() or 0
        failed_campaigns = self.db.query(func.count(Campaign.id)).filter(
            Campaign.status == CampaignStatus.FAILED
        ).scalar() or 0

        # Clip metrics
        total_clips = self.db.query(func.count(Clip.id)).scalar() or 0
        submitted_clips = self.db.query(func.count(Clip.id)).filter(
            Clip.status.in_([ClipStatus.SUBMITTED, ClipStatus.ACCEPTED, ClipStatus.REJECTED_PLATFORM])
        ).scalar() or 0
        accepted_clips = self.db.query(func.count(Clip.id)).filter(
            Clip.status == ClipStatus.ACCEPTED
        ).scalar() or 0

        # Revenue
        total_revenue = self.db.query(func.sum(Submission.earnings_usd)).scalar() or 0.0

        # Acceptance rate
        acceptance_rate = (accepted_clips / submitted_clips * 100) if submitted_clips > 0 else 0.0

        # Running jobs
        running_jobs = self.db.query(func.count(Job.id)).filter(
            Job.status == JobStatus.RUNNING
        ).scalar() or 0
        failed_jobs = self.db.query(func.count(Job.id)).filter(
            Job.status == JobStatus.FAILED
        ).scalar() or 0

        return {
            "campaigns": {
                "total": total_campaigns,
                "active": active_campaigns,
                "completed": completed_campaigns,
                "failed": failed_campaigns,
            },
            "clips": {
                "total": total_clips,
                "submitted": submitted_clips,
                "accepted": accepted_clips,
                "acceptance_rate": round(acceptance_rate, 1),
            },
            "revenue": {
                "total_usd": round(total_revenue, 2),
            },
            "jobs": {
                "running": running_jobs,
                "failed": failed_jobs,
            },
            "ts": datetime.now(timezone.utc).isoformat(),
        }

    def get_revenue_chart(self, days: int = 30) -> list[dict]:
        from app.models.submission import Submission
        from app.models.analytics import DailyAnalytics

        snapshots = (
            self.db.query(DailyAnalytics)
            .filter(DailyAnalytics.date >= (date.today() - timedelta(days=days)).isoformat())
            .order_by(DailyAnalytics.date.asc())
            .all()
        )

        return [
            {
                "date": s.date,
                "revenue": s.revenue_usd,
                "clips_generated": s.clips_generated,
                "clips_accepted": s.clips_accepted,
                "acceptance_rate": s.acceptance_rate,
            }
            for s in snapshots
        ]

    def aggregate_today(self) -> None:
        """Called by Celery beat to write today's analytics snapshot."""
        from app.models.analytics import DailyAnalytics
        from app.models.campaign import Campaign, CampaignStatus
        from app.models.clip import Clip, ClipStatus
        from app.models.submission import Submission

        today = date.today().isoformat()

        existing = self.db.query(DailyAnalytics).filter(DailyAnalytics.date == today).first()
        if not existing:
            existing = DailyAnalytics(date=today)
            self.db.add(existing)

        summary = self.get_dashboard_summary()
        existing.campaigns_discovered = summary["campaigns"]["total"]
        existing.campaigns_completed = summary["campaigns"]["completed"]
        existing.campaigns_failed = summary["campaigns"]["failed"]
        existing.clips_generated = summary["clips"]["total"]
        existing.clips_submitted = summary["clips"]["submitted"]
        existing.clips_accepted = summary["clips"]["accepted"]
        existing.acceptance_rate = summary["clips"]["acceptance_rate"]
        existing.revenue_usd = summary["revenue"]["total_usd"]

        self.db.flush()
