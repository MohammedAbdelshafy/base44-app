"""
Pytest fixtures shared across all tests.
Uses an in-memory SQLite DB to avoid requiring PostgreSQL for unit tests.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.config import Settings


# Override settings for testing
@pytest.fixture(scope="session", autouse=True)
def override_settings(monkeypatch=None):
    import os
    os.environ["APP_ENV"] = "test"
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
    os.environ["REDIS_URL"] = "redis://localhost:6379/15"
    os.environ["ANTHROPIC_API_KEY"] = "test-key"
    os.environ["STORAGE_ENDPOINT"] = "http://localhost:9000"
    os.environ["AUTO_SUBMIT"] = "false"
    os.environ["ADMIN_USERNAME"] = "admin"
    os.environ["ADMIN_PASSWORD"] = "change-me-admin-password"


@pytest_asyncio.fixture
async def test_db():
    """In-memory async SQLite database for each test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def client(test_db):
    """FastAPI test client with DB override."""
    from app.core.config import get_settings

    get_settings.cache_clear()

    from app.main import app
    from app.api.deps import get_db

    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_page(test_db):
    """Create a sample Page for tests."""
    import asyncio
    from app.models.page import Page

    async def _create():
        page = Page(
            id="test-page-001",
            name="Test Page",
            platform_id="test-platform-001",
            email="test@example.com",
        )
        test_db.add(page)
        await test_db.commit()
        return page

    return asyncio.get_event_loop().run_until_complete(_create())
