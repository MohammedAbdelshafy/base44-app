"""
Transcript model — Whisper output for a source content file.
Stores full word-level timestamps for precise clip cutting.
"""
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.source_content import SourceContent


class Transcript(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "transcripts"

    source_content_id: Mapped[str] = mapped_column(
        ForeignKey("source_contents.id"), nullable=False, unique=True
    )

    # Full text
    full_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Word-level segments from Whisper
    # [{"start": 0.0, "end": 1.2, "text": "Hello", "confidence": 0.98}, ...]
    segments: Mapped[list] = mapped_column(JSON, default=list)

    # Speaker diarization from Pyannote (optional)
    # [{"speaker": "SPEAKER_00", "start": 0.0, "end": 5.3}, ...]
    speakers: Mapped[list] = mapped_column(JSON, default=list)

    # Analysis outputs from Content Analysis Agent
    # [{"start": 10.2, "end": 45.0, "type": "emotional_peak", "score": 0.87, "reason": "..."}, ...]
    viral_moments: Mapped[list] = mapped_column(JSON, default=list)

    # Clip candidate windows
    # [{"start": 10.2, "end": 70.5, "score": 0.91, "tags": ["hook", "story_arc"]}, ...]
    clip_candidates: Mapped[list] = mapped_column(JSON, default=list)

    # Processing metadata
    whisper_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    processing_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")

    source_content: Mapped["SourceContent"] = relationship(back_populates="transcript")

    def __repr__(self) -> str:
        return f"<Transcript id={self.id} lang={self.language} status={self.status}>"
