from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.general_manager import GeneralManager
from app.core.database import get_db
from app.core.permissions import require_user_permission
from app.core.security import Actor, get_current_actor
from app.integrations.excel.importer import import_customers_excel
from app.models.orchestration import IntegrationLog

router = APIRouter(prefix="/api", tags=["operations", "reports"])
_gm = GeneralManager()


@router.get("/dashboard/overview")
async def dashboard_overview(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_user_permission(actor, "dashboard:read")
    return await _gm.executive_overview(db)


@router.get("/integrations/status")
async def integrations_status(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_user_permission(actor, "integrations:read")
    recent = (
        await db.execute(select(IntegrationLog).order_by(IntegrationLog.created_at.desc()).limit(20))
    ).scalars().all()
    return {
        "integrations": ["excel", "whatsapp", "email", "meta", "telegram"],
        "recent_logs": [
            {
                "id": log.id,
                "integration": log.integration,
                "direction": log.direction,
                "status": log.status,
                "details": log.details,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent
        ],
    }


@router.post("/import/excel")
async def import_excel(
    file: UploadFile = File(...),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_user_permission(actor, "imports:write")
    content = await file.read()
    summary = await import_customers_excel(db, content)
    return {"filename": file.filename, **summary}


@router.get("/reports/daily")
async def daily_report(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_user_permission(actor, "reports:read")
    overview = await _gm.executive_overview(db)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_type": "daily",
        **overview,
    }

