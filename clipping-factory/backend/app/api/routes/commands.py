"""
Command Center API — natural-language command execution.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user

router = APIRouter(prefix="/commands", tags=["commands"])


class CommandRequest(BaseModel):
    text: str


@router.post("")
async def execute_command(
    body: CommandRequest,
    user: str = Depends(get_current_user),
):
    """
    Execute a natural-language command.
    Uses sync DB session in thread pool to avoid blocking.
    """
    import asyncio
    from app.core.database import SyncSessionLocal
    from app.services.command_service import CommandService

    loop = asyncio.get_event_loop()

    def _execute():
        with SyncSessionLocal() as db:
            svc = CommandService(db)
            result = svc.execute(body.text, actor=user)
            db.commit()
            return result

    return await loop.run_in_executor(None, _execute)


@router.get("/history")
async def get_command_history(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    from app.models.audit_log import AuditLog
    from sqlalchemy import select, desc
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "command")
        .order_by(desc(AuditLog.created_at))
        .limit(50)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "command": l.new_value,
            "actor": l.actor,
            "action": l.action,
            "ts": l.created_at.isoformat(),
        }
        for l in logs
    ]
