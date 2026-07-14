"""
Submission model — tracks each upload attempt to Clipping.com and the outcome.
"""
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.deliverable import Deliverable


class Submission(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "submissions"

    deliverable_id: Mapped[str] = mapped_column(
        ForeignKey("deliverables.id"), nullable=False, unique=True
    )
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), nullable=False)
    page_id: Mapped[str] = mapped_column(ForeignKey("pages.id"), nullable=False)

    # Platform response
    platform_submission_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # pending | uploading | submitted | accepted | rejected | error

    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    outcome_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    earnings_usd: Mapped[float] = mapped_column(Float, default=0.0)

    # Upload metadata
    upload_attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    submission_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    deliverable: Mapped["Deliverable"] = relationship(back_populates="submission")
