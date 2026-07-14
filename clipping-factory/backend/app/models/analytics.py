"""
Analytics models — daily aggregated metrics snapshots and health check records.
"""
from sqlalchemy import JSON, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class DailyAnalytics(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "daily_analytics"

    date: Mapped[str] = mapped_column(String(10), unique=True)  # YYYY-MM-DD

    # Campaign metrics
    campaigns_discovered: Mapped[int] = mapped_column(Integer, default=0)
    campaigns_completed: Mapped[int] = mapped_column(Integer, default=0)
    campaigns_failed: Mapped[int] = mapped_column(Integer, default=0)

    # Clip metrics
    clips_generated: Mapped[int] = mapped_column(Integer, default=0)
    clips_submitted: Mapped[int] = mapped_column(Integer, default=0)
    clips_accepted: Mapped[int] = mapped_column(Integer, default=0)
    clips_rejected: Mapped[int] = mapped_column(Integer, default=0)
    acceptance_rate: Mapped[float] = mapped_column(Float, default=0.0)

    # Financial
    revenue_usd: Mapped[float] = mapped_column(Float, default=0.0)

    # Processing
    avg_processing_time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    total_video_minutes_processed: Mapped[float] = mapped_column(Float, default=0.0)

    # AI cost
    ai_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)

    # Storage
    storage_bytes_used: Mapped[int] = mapped_column(Integer, default=0)

    raw_data: Mapped[dict] = mapped_column(JSON, default=dict)


class HealthCheck(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "health_checks"

    # Overall status
    status: Mapped[str] = mapped_column(String(50))  # healthy | degraded | critical

    # Service statuses
    services: Mapped[dict] = mapped_column(JSON, default=dict)
    # {
    #   "postgres": "up", "redis": "up", "minio": "up",
    #   "celery_workers": {"campaigns": 1, "video": 2},
    #   "queue_depths": {"campaigns": 3, "video": 5},
    #   "failed_tasks_last_hour": 2
    # }

    # System resources
    cpu_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    memory_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    disk_percent: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Alerts fired
    alerts: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
