"""
SocialPost model — tracks each publish attempt of a clip to a social platform
(TikTok, Instagram, YouTube) via browser automation.

A single clip can be published to multiple platforms, so (clip_id, platform)
is the natural grain — unlike Submission, which is 1:1 with a Clipping.com
deliverable. Mirrors the audit/earnings shape of Submission for consistency.
"""
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.clip import Clip


class SocialPlatform:
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    YOUTUBE = "youtube"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    ALL_PLATFORMS = (TIKTOK, INSTAGRAM, YOUTUBE, LINKEDIN, TWITTER)

    @classmethod
    def resolve(cls, platforms: list[str] | None) -> list[str]:
        """Resolve 'all' to all platforms; pass through specific platforms."""
        if not platforms:
            return []
        resolved = []
        for p in platforms:
            if p == "all":
                resolved.extend(cls.ALL_PLATFORMS)
            else:
                resolved.append(p.lower())
        return list(dict.fromkeys(resolved))  # deduplicate preserving order


class SocialPostStatus:
    PENDING = "pending"
    UPLOADING = "uploading"
    PUBLISHED = "published"
    FAILED = "failed"
    SIMULATED = "simulated"   # produced by the mock fallback (no creds / no Playwright)


class SocialPost(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "social_posts"

    clip_id: Mapped[str] = mapped_column(ForeignKey("clips.id"), nullable=False)
    campaign_id: Mapped[str | None] = mapped_column(
        ForeignKey("campaigns.id"), nullable=True
    )

    platform: Mapped[str] = mapped_column(String(50), nullable=False)  # tiktok | instagram | youtube
    status: Mapped[str] = mapped_column(String(50), default=SocialPostStatus.PENDING)

    # What we posted
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Platform response
    platform_post_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    post_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Attempt tracking
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    post_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    clip: Mapped["Clip"] = relationship()

    def __repr__(self) -> str:
        return f"<SocialPost clip={self.clip_id[:8]} {self.platform} status={self.status}>"
