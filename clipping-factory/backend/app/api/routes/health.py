"""
Health API routes — system status, queue depths, worker info.
Includes SSE stream for real-time dashboard updates.
"""
import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def get_health(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    from app.models.analytics import HealthCheck
    result = await db.execute(
        select(HealthCheck).order_by(HealthCheck.created_at.desc()).limit(1)
    )
    latest = result.scalar_one_or_none()

    if not latest:
        return {"status": "unknown", "message": "No health data yet"}

    return {
        "status": latest.status,
        "services": latest.services,
        "cpu_percent": latest.cpu_percent,
        "memory_percent": latest.memory_percent,
        "disk_percent": latest.disk_percent,
        "alerts": latest.alerts,
        "ts": latest.created_at.isoformat(),
    }


@router.get("/queue-depths")
async def get_queue_depths(_: str = Depends(get_current_user)):
    try:
        import redis.asyncio as aioredis
        from app.core.config import get_settings
        _settings = get_settings()
        r = aioredis.from_url(_settings.redis_url, decode_responses=True)
        queues = ["campaigns", "acquisition", "analysis", "video", "delivery", "health", "default", "dlq"]
        depths = {q: await r.llen(q) for q in queues}
        await r.aclose()
        return depths
    except Exception as exc:
        return {"error": str(exc)}


@router.get("/jobs")
async def get_recent_jobs(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    from app.models.job import Job
    from sqlalchemy import desc
    result = await db.execute(
        select(Job).order_by(desc(Job.created_at)).limit(50)
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "task": j.task_name,
            "status": j.status,
            "progress": j.progress,
            "progress_message": j.progress_message,
            "attempt": j.attempt,
            "error": j.error_message,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@router.get("/stream")
async def health_stream(_: str = Depends(get_current_user)):
    """
    Server-Sent Events stream for real-time health updates.
    Frontend connects to this endpoint and receives push updates.
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        import redis.asyncio as aioredis
        from app.core.config import get_settings
        settings = get_settings()

        r = aioredis.from_url(settings.redis_url)
        pubsub = r.pubsub()
        await pubsub.subscribe("health", "alerts")

        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=30)
                if message:
                    data = message.get("data", "")
                    if isinstance(data, bytes):
                        data = data.decode()
                    yield f"data: {data}\n\n"
                else:
                    # Keep-alive
                    yield ": keep-alive\n\n"
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe("health", "alerts")
            await r.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/trigger")
async def trigger_health_check(_: str = Depends(get_current_user)):
    from app.workers.health_tasks import run_health_check
    task = run_health_check.apply_async(queue="health")
    return {"task_id": task.id}
