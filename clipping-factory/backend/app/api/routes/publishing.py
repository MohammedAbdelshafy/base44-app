"""
Publishing API routes — publish clips to social platforms.
Supports "all" to publish to every configured platform.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.social_post import SocialPlatform

router = APIRouter(prefix="/publish", tags=["publishing"])


class PublishRequest(BaseModel):
    clip_id: str
    platforms: Optional[list[str]] = None
    caption: Optional[str] = None
    title: Optional[str] = None


class PublishResponse(BaseModel):
    clip_id: str
    platforms: list[str]
    results: dict
    published: list[str]


@router.post("/clip", response_model=PublishResponse)
async def publish_clip(
    req: PublishRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    from app.agents.publishing import PublishingAgent
    from app.core.database import SyncSessionLocal

    platforms = SocialPlatform.resolve(req.platforms or ["all"])
    if not platforms:
        raise HTTPException(400, "No valid target platforms")

    sync_db = SyncSessionLocal()
    try:
        agent = PublishingAgent(db=sync_db)
        result = agent.run(clip_id=req.clip_id, platforms=platforms)
        if not result.success:
            raise HTTPException(400, result.error)
        sync_db.commit()
        return {
            "clip_id": req.clip_id,
            "platforms": platforms,
            "results": result.data.get("results", {}),
            "published": result.data.get("published", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        sync_db.rollback()
        raise HTTPException(500, str(e))
    finally:
        sync_db.close()


@router.get("/platforms")
async def list_platforms():
    return {
        "platforms": list(SocialPlatform.ALL_PLATFORMS),
        "all_shortcut": True,
        "description": "Use 'all' to publish to every platform at once",
    }
