from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.permissions import require_user_permission, validate_dual_permissions
from app.core.security import Actor, get_current_actor
from app.models.orchestration import Agent
from app.orchestrator.dispatcher import TaskDispatcher
from app.orchestrator.task_manager import TaskManager
from app.schemas.orchestration import AgentOut, AgentRunRequest, TaskOut

router = APIRouter(prefix="/api/agents", tags=["agents"])
_task_manager = TaskManager()
_dispatcher = TaskDispatcher()


@router.get("", response_model=list[AgentOut])
async def list_agents(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[Agent]:
    require_user_permission(actor, "agents:read")
    rows = (await db.execute(select(Agent).order_by(Agent.id))).scalars().all()
    return list(rows)


@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(
    agent_id: str,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> Agent:
    require_user_permission(actor, "agents:read")
    agent = (await db.execute(select(Agent).where(Agent.id == agent_id))).scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.post("/{agent_id}/run", response_model=TaskOut, status_code=status.HTTP_202_ACCEPTED)
async def run_agent(
    agent_id: str,
    body: AgentRunRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=8, max_length=120),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> object:
    await validate_dual_permissions(db, actor, "agents:run", agent_id, "task.run")
    task = await _task_manager.create_task(
        db,
        agent_id=agent_id,
        task_type=body.task_type,
        payload=body.payload,
        priority=body.priority,
        created_by=actor.user_id,
        idempotency_key=idempotency_key,
    )
    _dispatcher.dispatch(task.id)
    return task

