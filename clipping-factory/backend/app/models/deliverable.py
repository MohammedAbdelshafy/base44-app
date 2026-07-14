"""
Deliverable model — the final packaged file ready for submission to Clipping.com.
"""
from typing import TYPE_CHECKING

from sqlalchemy import JSON, BigInteger, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.clip import Clip
    from app.models.submission import Submission


class Deliverable(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "deliverables"

    clip_id: Mapped[str] = mapped_column(ForeignKey("clips.id"), nullable=False, unique=True)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), nullable=False)

    # Final packaged file
    storage_bucket: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(Text)
    file_name: Mapped[str] = mapped_column(String(512))
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), default="video/mp4")

    # Validation
    validation_passed: Mapped[bool] = mapped_column(default=False)
    validation_details: Mapped[dict] = mapped_column(JSON, default=dict)

    status: Mapped[str] = mapped_column(String(50), default="ready")
    # ready | uploading | uploaded | failed

    clip: Mapped["Clip"] = relationship(back_populates="deliverable")
    submission: Mapped["Submission | None"] = relationship(
        back_populates="deliverable", uselist=False
    )
