"""
SourceContent model — a downloaded/acquired source video file for a campaign.
"""
from typing import TYPE_CHECKING

from sqlalchemy import JSON, BigInteger, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.clip import Clip
    from app.models.transcript import Transcript


class SourceContent(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "source_contents"

    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), nullable=False)

    # Original source
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(50))  # youtube | gdrive | dropbox | direct
    original_title: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Storage (nullable until download completes)
    storage_bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    checksum_md5: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Video metadata (populated after download)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fps: Mapped[float | None] = mapped_column(Float, nullable=True)
    codec: Mapped[str | None] = mapped_column(String(50), nullable=True)
    audio_codec: Mapped[str | None] = mapped_column(String(50), nullable=True)
    extra_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    status: Mapped[str] = mapped_column(String(50), default="downloading")
    # downloading | ready | failed | expired

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="source_contents")
    transcript: Mapped["Transcript | None"] = relationship(back_populates="source_content", uselist=False)
    clips: Mapped[list["Clip"]] = relationship(back_populates="source_content")

    def __repr__(self) -> str:
        return f"<SourceContent id={self.id} type={self.source_type} status={self.status}>"
