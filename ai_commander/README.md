# AI Commander — Al Zomoroda Cosmetics

Zero-cost, deterministic-first AI operations orchestrator (`FastAPI` + `SQLAlchemy` + `Alembic` + optional `Celery/Redis`).

## Zero-Cost Design Rules
- **No paid AI by default:** `AI_ENABLED=false` and `AI_DAILY_CALL_LIMIT=0`. All Phase 1/2 agents and General Manager engines run deterministically.
- **No paid SaaS dependencies:** Sentry is optional (`observability` extra, disabled unless `SENTRY_DSN` is set).
- **Two free deployment modes:**
  1. **Single-Process Free Mode (`QUEUE_MODE=eager` + SQLite):** No Redis or Docker required.
  2. **Self-Hosted Docker Mode (`QUEUE_MODE=celery` + PostgreSQL 16 + Redis 7):** Full async worker scaling at `$0` SaaS cost.

## Quick Start (Plug-and-Play, $0, No Env Setup Required)
```bash
cd ai_commander
pip install -e .
uvicorn app.main:app --reload
```
Tables are auto-created in local SQLite (`ai_commander.db`) and all 20 agents are seeded on startup. Open `http://127.0.0.1:8000/docs` for Swagger UI.

## Quick Start (Docker Compose)
```bash
cd ai_commander
docker compose -f docker/docker-compose.yml up --build
docker compose -f docker/docker-compose.yml exec api alembic upgrade head
```

## Run Tests
```bash
cd ai_commander
pip install -e ".[dev]"
pytest
```

