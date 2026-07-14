"""
Analytics API routes — dashboard summary, revenue, charts.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(_: str = Depends(get_current_user)):
    from app.services.analytics_service import AnalyticsService
    import asyncio
    from app.core.database import SyncSessionLocal

    def _get():
        with SyncSessionLocal() as sdb:
            return AnalyticsService(sdb).get_dashboard_summary()

    return await asyncio.get_running_loop().run_in_executor(None, _get)


@router.get("/revenue")
async def get_revenue(
    days: int = Query(30, ge=1, le=365),
    _: str = Depends(get_current_user),
):
    import asyncio
    from app.core.database import SyncSessionLocal
    from app.services.analytics_service import AnalyticsService

    def _get():
        with SyncSessionLocal() as sdb:
            return AnalyticsService(sdb).get_revenue_chart(days=days)

    return await asyncio.get_running_loop().run_in_executor(None, _get)


@router.get("/audit-log")
async def get_audit_log(
    entity_type: str | None = None,
    entity_id: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    from app.models.audit_log import AuditLog
    from sqlalchemy import select, desc

    q = select(AuditLog)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(AuditLog.entity_id == entity_id)
    q = q.order_by(desc(AuditLog.created_at)).offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(q)
    logs = result.scalars().all()

    return [
        {
            "id": l.id,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "action": l.action,
            "actor": l.actor,
            "old_value": l.old_value,
            "new_value": l.new_value,
            "ts": l.created_at.isoformat(),
        }
        for l in logs
    ]
