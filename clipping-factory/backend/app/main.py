"""
FastAPI application entry point.
Registers all routers, startup/shutdown hooks, middleware, and metrics endpoint.
"""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging_config import configure_logging, get_logger

settings = get_settings()
configure_logging()
logger = get_logger("main")


async def _ensure_operator_page() -> None:
    """
    Create the operator's Clipping.com page record if it doesn't exist.
    This eliminates the need to manually add a page through the dashboard.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.page import Page

    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(Page).where(Page.email == settings.clipping_email)
        )
        existing = result.scalar_one_or_none()
        if existing:
            logger.info(f"Operator page already exists: {existing.name} ({existing.id})")
            await session.commit()
            return

        import uuid
        page = Page(
            id=str(uuid.uuid4()),
            name=f"Main Page ({settings.clipping_email.split('@')[0]})",
            platform_id=f"operator-{settings.clipping_email}",
            email=settings.clipping_email,
            is_active=True,
            is_paused=False,
        )
        session.add(page)
        await session.commit()
        logger.info(f"Auto-created operator page: {page.name} ({page.id})")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown sequence."""
    logger.info("Starting Clipping Factory API")

    # Initialize database tables
    try:
        from app.core.database import init_db
        await init_db()
        logger.info("Database initialized")
    except Exception as exc:
        logger.warning(f"Database not available at startup (will retry on first request): {exc}")

    # Ensure storage buckets exist
    try:
        from app.core.storage import ensure_buckets
        ensure_buckets()
        logger.info("Storage buckets ready")
    except Exception as exc:
        logger.warning(f"Storage initialization warning: {exc}")

    # Auto-seed the operator's Clipping.com page so scanning runs without manual setup
    if settings.clipping_email and settings.clipping_email not in ("your@email.com", ""):
        try:
            await _ensure_operator_page()
        except Exception as exc:
            logger.warning(f"Could not auto-seed operator page: {exc}")

    yield

    logger.info("Shutting down Clipping Factory API")


app = FastAPI(
    title="Clipping Factory API",
    description="Autonomous Clipping.com Campaign Operating System",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# CORS — tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc) if not settings.is_production else None},
    )


# Register routers
from app.api.routes import campaigns, clips, pages, health, analytics, commands, mbm, publishing

app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(clips.router, prefix="/api/v1")
app.include_router(pages.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(commands.router, prefix="/api/v1")
app.include_router(mbm.router, prefix="/api/v1")
app.include_router(publishing.router, prefix="/api/v1")


# Prometheus metrics (disabled — prometheus-fastapi-instrumentator 7.x
# is incompatible with FastAPI 0.115+ _IncludedRouter; re-enable after upgrade)
# try:
#     from prometheus_fastapi_instrumentator import Instrumentator
#     Instrumentator().instrument(app).expose(app, endpoint="/metrics")
# except ImportError:
#     pass


@app.get("/")
async def root():
    return {
        "service": "Clipping Factory API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/ping")
async def ping():
    return {"pong": True}
