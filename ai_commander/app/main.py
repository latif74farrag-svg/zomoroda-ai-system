from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.agents.registry import seed_roster
from app.api.agents import router as agents_router
from app.api.operations import router as operations_router
from app.api.tasks import router as tasks_router
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.logging import configure_logging
import app.models.orchestration  # noqa: F401
import app.models.domain  # noqa: F401

configure_logging()
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Plug-and-play startup: ensure tables exist (for local SQLite) and seed the 20-agent roster."""
    if settings.database_url.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_roster(session, global_paused=False)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.include_router(agents_router)
app.include_router(tasks_router)
app.include_router(operations_router)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai_commander"}

