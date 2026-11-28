import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.agents.registry import seed_roster
from app.api import agents as agents_api
from app.api import tasks as tasks_api
from app.core.database import Base, get_db
from app.core.security import create_session_token
from app.main import app
from app.models.orchestration import TaskStatus
from app.orchestrator.task_manager import TaskManager


@pytest.fixture
async def db_session(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    # Avoid requiring Redis/Celery broker in unit tests; track dispatched task IDs
    dispatched: list[str] = []
    monkeypatch.setattr(tasks_api._dispatcher, "dispatch", lambda task_id: dispatched.append(task_id))
    monkeypatch.setattr(agents_api._dispatcher, "dispatch", lambda task_id: dispatched.append(task_id))

    async with SessionLocal() as session:
        await seed_roster(session, global_paused=False)
        yield session, dispatched

    app.dependency_overrides.clear()
    await engine.dispose()


async def test_phase1_task_lifecycle_and_hitl_approval(db_session):
    session, dispatched = db_session
    admin_token = create_session_token("admin-1", "admin")
    headers = {"Authorization": f"Bearer {admin_token}", "Idempotency-Key": "task-key-0001"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/tasks",
            json={"agent_id": "pricing", "task_type": "pricing.simulate", "payload": {"sku": "RONZA-01"}},
            headers=headers,
        )
        assert resp.status_code == 202
        task_id = resp.json()["id"]
        assert resp.json()["status"] == TaskStatus.PENDING
        assert dispatched == [task_id]

        # Idempotent replay returns same task
        replay = await client.post(
            "/api/tasks",
            json={"agent_id": "pricing", "task_type": "pricing.simulate", "payload": {"sku": "RONZA-01"}},
            headers=headers,
        )
        assert replay.status_code == 202
        assert replay.json()["id"] == task_id

        # Execute via TaskManager -> transitions PENDING -> RUNNING -> VERIFYING -> AWAITING_APPROVAL
        executed = await TaskManager().execute_task(session, task_id)
        assert executed.status == TaskStatus.AWAITING_APPROVAL

        # Approve via HITL endpoint -> COMPLETED
        approved = await client.post(
            f"/api/tasks/{task_id}/approve",
            json={"reason": "Verified pricing simulation"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert approved.status_code == 200
        assert approved.json()["status"] == TaskStatus.COMPLETED

        # Verify audit trail events
        detail = await client.get(f"/api/tasks/{task_id}", headers={"Authorization": f"Bearer {admin_token}"})
        statuses = [e["to_status"] for e in detail.json()["events"]]
        assert statuses == [
            TaskStatus.PENDING,
            TaskStatus.RUNNING,
            TaskStatus.VERIFYING,
            TaskStatus.AWAITING_APPROVAL,
            TaskStatus.COMPLETED,
        ]


async def test_dual_rbac_blocks_unauthorized_user_or_agent(db_session):
    viewer_token = create_session_token("viewer-1", "viewer")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/tasks",
            json={"agent_id": "pricing", "task_type": "pricing.simulate", "payload": {}},
            headers={"Authorization": f"Bearer {viewer_token}", "Idempotency-Key": "task-key-0002"},
        )
        assert resp.status_code == 403

