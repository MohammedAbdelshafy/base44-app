"""
Page model — represents a Clipping.com account/page being managed.
One page = one creator identity on the platform.
"""
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.campaign import Campaign


class Page(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "pages"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    platform_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_paused: Mapped[bool] = mapped_column(Boolean, default=False)

    # Stored encrypted session cookie for Playwright
    session_cookie: Mapped[str | None] = mapped_column(Text, nullable=True)
    session_expires_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Platform-specific settings (aspect ratios, preferred categories, etc.)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)

    # Stats
    campaigns_completed: Mapped[int] = mapped_column(default=0)
    campaigns_failed: Mapped[int] = mapped_column(default=0)
    total_earnings_usd: Mapped[float] = mapped_column(default=0.0)
    acceptance_rate: Mapped[float] = mapped_column(default=0.0)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="page")

    def __repr__(self) -> str:
        return f"<Page id={self.id} name={self.name} active={self.is_active}>"
