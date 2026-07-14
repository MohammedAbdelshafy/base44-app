"""
Pages API — manage Clipping.com accounts/pages.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.page import Page

router = APIRouter(prefix="/pages", tags=["pages"])


class CreatePageRequest(BaseModel):
    name: str
    email: str
    settings: dict = {}


class UpdatePageRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    is_paused: Optional[bool] = None
    settings: Optional[dict] = None
    notes: Optional[str] = None


@router.get("")
async def list_pages(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(select(Page).order_by(Page.created_at.desc()))
    pages = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "is_active": p.is_active,
            "is_paused": p.is_paused,
            "campaigns_completed": p.campaigns_completed,
            "total_earnings_usd": p.total_earnings_usd,
            "acceptance_rate": p.acceptance_rate,
            "settings": p.settings,
            "notes": p.notes,
            "created_at": p.created_at.isoformat(),
        }
        for p in pages
    ]


@router.post("")
async def create_page(
    body: CreatePageRequest,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    import uuid
    page = Page(
        id=str(uuid.uuid4()),
        name=body.name,
        platform_id=f"manual-{body.email}",
        email=body.email,
        settings=body.settings,
    )
    db.add(page)
    await db.flush()
    return {"id": page.id, "name": page.name}


@router.patch("/{page_id}")
async def update_page(
    page_id: str,
    body: UpdatePageRequest,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")

    if body.name is not None:
        page.name = body.name.strip()
    if body.is_active is not None:
        page.is_active = body.is_active
    if body.is_paused is not None:
        page.is_paused = body.is_paused
    if body.settings is not None:
        page.settings = body.settings
    if body.notes is not None:
        page.notes = body.notes

    await db.flush()
    return {"id": page.id, "updated": True}


@router.delete("/{page_id}")
async def delete_page(
    page_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")
    page.is_active = False
    page.is_paused = True
    return {"id": page_id, "deactivated": True}


@router.post("/{page_id}/scan")
async def trigger_scan(
    page_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    """Manually trigger a campaign scan for a specific page."""
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")
    from app.workers.campaign_tasks import scan_for_campaigns
    task = scan_for_campaigns.apply_async(args=[page_id], queue="campaigns")
    return {"task_id": task.id, "status": "scanning"}
