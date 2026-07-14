"""
Job model — tracks every async Celery task for observability and retry management.
"""
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.campaign import Campaign


class JobStatus:
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD = "dead"       # Exhausted retries, moved to DLQ


class Job(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "jobs"

    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    campaign_id: Mapped[str | None] = mapped_column(
        ForeignKey("campaigns.id"), nullable=True
    )

    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    queue: Mapped[str] = mapped_column(String(100), default="default")
    status: Mapped[str] = mapped_column(String(50), default=JobStatus.PENDING)

    # Progress (0-100)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    progress_message: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Input/output snapshots for debugging
    input_args: Mapped[dict] = mapped_column(JSON, default=dict)
    result: Mapped[dict] = mapped_column(JSON, default=dict)

    # Timing
    started_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    finished_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Retry tracking
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_traceback: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign | None"] = relationship(back_populates="jobs")

    def __repr__(self) -> str:
        return f"<Job id={self.id} task={self.task_name} status={self.status}>"
