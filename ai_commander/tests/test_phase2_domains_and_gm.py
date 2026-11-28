import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.agents.registry import seed_roster
from app.core.database import Base, get_db
from app.core.security import create_session_token
from app.crm.entity_resolution import resolve_or_create_customer
from app.main import app
import app.models.domain  # noqa: F401


@pytest.fixture
async def phase2_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with SessionLocal() as session:
        await seed_roster(session, global_paused=False)
        yield session

    app.dependency_overrides.clear()
    await engine.dispose()


async def test_unified_entity_resolution_deduplicates_whatsapp(phase2_db):
    c1, created1 = await resolve_or_create_customer(
        phase2_db,
        channel="whatsapp",
        contact_value="+20 100 123 4567",
        name="Pharmacy Al Noor",
        sector="pharmacies",
    )
    c2, created2 = await resolve_or_create_customer(
        phase2_db,
        channel="whatsapp",
        contact_value="01001234567",
        name="Al Noor Duplicate",
        sector="pharmacies",
    )
    assert created1 is True
    assert created2 is False
    assert c1.id == c2.id


async def test_dashboard_overview_never_hallucinates_missing_kpis(phase2_db):
    token = create_session_token("admin-1", "admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/dashboard/overview", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["kpis"]["orders_count"] == 0
        assert data["kpis"]["booked_revenue_minor"] is None
        assert data["kpis"]["conversion_rate"] is None
        assert len(data["kpis"]["data_sufficiency_notes"]) >= 1

