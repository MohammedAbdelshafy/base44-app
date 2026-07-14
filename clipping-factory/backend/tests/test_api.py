"""
API integration tests — campaigns, clips, pages, health, commands.
"""
import pytest
import pytest_asyncio


@pytest.mark.asyncio
async def test_root(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "Clipping Factory API"


@pytest.mark.asyncio
async def test_ping(client):
    resp = await client.get("/ping")
    assert resp.status_code == 200
    assert resp.json()["pong"] is True


@pytest.mark.asyncio
async def test_list_campaigns_empty(client):
    resp = await client.get(
        "/api/v1/campaigns",
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_pages_empty(client):
    resp = await client.get(
        "/api/v1/pages",
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_page(client):
    resp = await client.post(
        "/api/v1/pages",
        json={"name": "Test Page", "email": "test@example.com"},
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Page"


@pytest.mark.asyncio
async def test_health_returns_data(client):
    resp = await client.get(
        "/api/v1/health/",
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_analytics_summary(client):
    resp = await client.get(
        "/api/v1/analytics/summary",
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "campaigns" in data
    assert "clips" in data
    assert "revenue" in data


@pytest.mark.asyncio
async def test_command_show_health(client):
    resp = await client.post(
        "/api/v1/commands",
        json={"text": "show health"},
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "success" in data


@pytest.mark.asyncio
async def test_campaign_not_found(client):
    resp = await client.get(
        "/api/v1/campaigns/nonexistent-id",
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_clip_not_found(client):
    resp = await client.get(
        "/api/v1/clips/nonexistent/download-url",
        headers={"Authorization": "Basic YWRtaW46Y2hhbmdlLW1lLWFkbWluLXBhc3N3b3Jk"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthorized(client):
    resp = await client.get("/api/v1/campaigns")
    assert resp.status_code == 401
