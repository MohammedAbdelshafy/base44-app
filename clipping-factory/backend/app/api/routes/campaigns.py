"""
Campaign API routes — CRUD, status management, human overrides.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.campaign import Campaign, CampaignStatus

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class CampaignOut(BaseModel):
    id: str
    title: str
    brand_name: Optional[str]
    status: str
    platform_campaign_id: str
    opportunity_score: float
    payment_per_accepted_clip: Optional[float]
    payout_per_1k_views: Optional[float]
    max_payout_cap: Optional[float]
    platform_name: str
    clips_generated: int
    clips_submitted: int
    clips_accepted: int
    clips_rejected: int
    actual_earnings: float
    requirements: dict
    due_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=dict)
async def list_campaigns(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q = select(Campaign)
    if status:
        q = q.where(Campaign.status == status)
    q = q.order_by(Campaign.payout_per_1k_views.desc().nulls_last(), Campaign.created_at.desc())
    q = q.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(q)
    campaigns = result.scalars().all()

    total_q = select(func.count(Campaign.id))
    if status:
        total_q = total_q.where(Campaign.status == status)
    total_result = await db.execute(total_q)
    total = total_result.scalar() or 0

    return {
        "items": [
            {
                "id": c.id,
                "title": c.title,
                "brand_name": c.brand_name,
                "status": c.status,
                "opportunity_score": c.opportunity_score,
                "payment": c.payment_per_accepted_clip,
                "payout_per_1k_views": c.payout_per_1k_views,
                "max_payout_cap": c.max_payout_cap,
                "platform_name": c.platform_name,
                "clips_generated": c.clips_generated,
                "clips_submitted": c.clips_submitted,
                "clips_accepted": c.clips_accepted,
                "actual_earnings": c.actual_earnings,
                "due_at": c.due_at,
                "created_at": c.created_at.isoformat(),
            }
            for c in campaigns
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    return {
        "id": campaign.id,
        "title": campaign.title,
        "brand_name": campaign.brand_name,
        "status": campaign.status,
        "requirements": campaign.requirements,
        "source_url": campaign.source_url,
        "source_type": campaign.source_type,
        "opportunity_score": campaign.opportunity_score,
        "payment_per_accepted_clip": campaign.payment_per_accepted_clip,
        "payout_per_1k_views": campaign.payout_per_1k_views,
        "max_payout_cap": campaign.max_payout_cap,
        "platform_name": campaign.platform_name,
        "clips_generated": campaign.clips_generated,
        "clips_submitted": campaign.clips_submitted,
        "clips_accepted": campaign.clips_accepted,
        "clips_rejected": campaign.clips_rejected,
        "actual_earnings": campaign.actual_earnings,
        "intelligence_notes": campaign.intelligence_notes,
        "error_message": campaign.error_message,
        "due_at": campaign.due_at,
        "created_at": campaign.created_at.isoformat(),
        "updated_at": campaign.updated_at.isoformat(),
    }


_PAUSABLE = {
    CampaignStatus.DISCOVERED, CampaignStatus.ANALYZING, CampaignStatus.READY,
    CampaignStatus.PROCESSING, CampaignStatus.QC, CampaignStatus.AWAITING_APPROVAL,
    CampaignStatus.DELIVERING,
}
_RESUMABLE = {CampaignStatus.PAUSED}
_REPROCESSABLE = {CampaignStatus.COMPLETED, CampaignStatus.FAILED, CampaignStatus.PAUSED, CampaignStatus.EXPIRED}


@router.post("/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign.status not in _PAUSABLE:
        raise HTTPException(400, f"Cannot pause a campaign with status '{campaign.status}'")
    campaign.status = CampaignStatus.PAUSED
    await db.flush()
    return {"status": "paused"}


@router.post("/{campaign_id}/resume")
async def resume_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign.status not in _RESUMABLE:
        raise HTTPException(400, f"Cannot resume a campaign with status '{campaign.status}'")
    campaign.status = CampaignStatus.READY
    await db.flush()
    return {"status": "resumed"}


@router.post("/{campaign_id}/reprocess")
async def reprocess_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign.status not in _REPROCESSABLE:
        raise HTTPException(400, f"Cannot reprocess a campaign with status '{campaign.status}'")
    campaign.status = CampaignStatus.READY
    campaign.clips_generated = 0
    campaign.error_message = None
    await db.flush()
    from app.workers.video_tasks import acquire_content
    acquire_content.apply_async(args=[campaign_id], queue="acquisition")
    return {"status": "reprocessing_started"}


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    campaign.is_active = False
    await db.flush()
    return {"status": "deactivated"}
