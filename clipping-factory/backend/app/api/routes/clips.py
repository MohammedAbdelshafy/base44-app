"""
Clip API routes — list, inspect, approve/reject, get presigned download URL.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.clip import Clip, ClipStatus

router = APIRouter(prefix="/clips", tags=["clips"])


@router.get("")
async def list_clips(
    campaign_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q = select(Clip)
    if campaign_id:
        q = q.where(Clip.campaign_id == campaign_id)
    if status:
        q = q.where(Clip.status == status)
    q = q.order_by(Clip.overall_score.desc(), Clip.created_at.desc())
    q = q.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(q)
    clips = result.scalars().all()

    total_q = select(func.count(Clip.id))
    if campaign_id:
        total_q = total_q.where(Clip.campaign_id == campaign_id)
    if status:
        total_q = total_q.where(Clip.status == status)
    total = (await db.execute(total_q)).scalar() or 0

    return {
        "items": [
            {
                "id": c.id,
                "campaign_id": c.campaign_id,
                "status": c.status,
                "overall_score": c.overall_score,
                "scores": c.scores,
                "duration_seconds": c.duration_seconds,
                "width": c.width,
                "height": c.height,
                "hook_text": c.hook_text,
                "qc_notes": c.qc_notes,
                "rejection_reason": c.rejection_reason,
                "edits_applied": c.edits_applied,
                "version": c.version,
                "created_at": c.created_at.isoformat(),
            }
            for c in clips
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{clip_id}/download-url")
async def get_download_url(
    clip_id: str,
    expiry: int = Query(3600, ge=60, le=86400),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    if not clip or not clip.storage_key:
        raise HTTPException(404, "Clip not found or not yet processed")

    from app.core.storage import get_presigned_url
    url = get_presigned_url(clip.storage_bucket, clip.storage_key, expiry)
    return {"url": url, "expires_in": expiry}


_APPROVABLE = {ClipStatus.AWAITING_APPROVAL, ClipStatus.QC_PASS, ClipStatus.QC_FAIL}
_REJECTABLE = {ClipStatus.AWAITING_APPROVAL, ClipStatus.QC_PASS, ClipStatus.QC_FAIL, ClipStatus.APPROVED}


@router.post("/{clip_id}/approve")
async def approve_clip(
    clip_id: str,
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    if not clip:
        raise HTTPException(404, "Clip not found")
    if clip.status not in _APPROVABLE:
        raise HTTPException(400, f"Cannot approve clip in status: {clip.status}")
    clip.status = ClipStatus.APPROVED
    clip.reviewed_by = user
    await db.flush()
    from app.workers.delivery_tasks import create_deliverable
    create_deliverable.apply_async(args=[clip_id], queue="delivery")
    return {"status": "approved", "clip_id": clip_id}


@router.post("/{clip_id}/reject")
async def reject_clip(
    clip_id: str,
    reason: str = Query("Rejected by operator", max_length=512),
    db: AsyncSession = Depends(get_db),
    user: str = Depends(get_current_user),
):
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    if not clip:
        raise HTTPException(404, "Clip not found")
    if clip.status not in _REJECTABLE:
        raise HTTPException(400, f"Cannot reject clip in status: {clip.status}")
    clip.status = ClipStatus.REJECTED_HUMAN
    clip.rejection_reason = reason.strip()
    clip.reviewed_by = user
    await db.flush()
    return {"status": "rejected", "clip_id": clip_id}
