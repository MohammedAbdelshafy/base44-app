"""
AuditLog model — immutable append-only event log for compliance and debugging.
Never update or delete rows from this table.
"""
from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class AuditLog(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "audit_logs"

    entity_type: Mapped[str] = mapped_column(String(100))   # campaign | clip | page | job
    entity_id: Mapped[str] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String(100))         # created | status_changed | scored | submitted
    actor: Mapped[str] = mapped_column(String(100), default="system")  # system | admin | agent_name
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

    def __repr__(self) -> str:
        return f"<AuditLog {self.entity_type}:{self.entity_id} {self.action}>"
