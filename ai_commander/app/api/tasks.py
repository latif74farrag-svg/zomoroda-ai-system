from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.approvals.engine import ApprovalEngine
from app.core.database import get_db
from app.core.permissions import require_user_permission, validate_dual_permissions
from app.core.security import Actor, get_current_actor
from app.models.orchestration import Approval, ApprovalStatus, Task, TaskEvent, TaskResult
from app.orchestrator.dispatcher import TaskDispatcher
from app.orchestrator.task_manager import TaskManager
from app.schemas.orchestration import (
    ApprovalDecisionRequest,
    ApprovalOut,
    TaskCreateRequest,
    TaskDetailOut,
    TaskOut,
)

router = APIRouter(prefix="/api", tags=["tasks", "approvals"])
_task_manager = TaskManager()
_dispatcher = TaskDispatcher()
_approvals = ApprovalEngine()


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[Task]:
    require_user_permission(actor, "tasks:read")
    rows = (await db.execute(select(Task).order_by(Task.created_at.desc()).limit(100))).scalars().all()
    return list(rows)


@router.post("/tasks", response_model=TaskOut, status_code=status.HTTP_202_ACCEPTED)
async def create_task(
    body: TaskCreateRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=8, max_length=120),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> Task:
    await validate_dual_permissions(db, actor, "tasks:create", body.agent_id, "task.run")
    task = await _task_manager.create_task(
        db,
        agent_id=body.agent_id,
        task_type=body.task_type,
        payload=body.payload,
        priority=body.priority,
        created_by=actor.user_id,
        idempotency_key=idempotency_key,
    )
    _dispatcher.dispatch(task.id)
    return task


@router.get("/tasks/{task_id}", response_model=TaskDetailOut)
async def get_task(
    task_id: str,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_user_permission(actor, "tasks:read")
    task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    events = (await db.execute(select(TaskEvent).where(TaskEvent.task_id == task_id).order_by(TaskEvent.id))).scalars().all()
    result = (await db.execute(select(TaskResult).where(TaskResult.task_id == task_id))).scalar_one_or_none()
    return {
        **TaskOut.model_validate(task).model_dump(),
        "events": list(events),
        "result": result.output if result else None,
    }


@router.post("/tasks/{task_id}/approve", response_model=TaskOut)
async def approve_task(
    task_id: str,
    body: ApprovalDecisionRequest | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> Task:
    require_user_permission(actor, "tasks:approve")
    return await _approvals.decide(
        db,
        task_id=task_id,
        decision=ApprovalStatus.APPROVED,
        reviewer=actor.user_id,
        reason=body.reason if body else None,
    )


@router.post("/tasks/{task_id}/reject", response_model=TaskOut)
async def reject_task(
    task_id: str,
    body: ApprovalDecisionRequest | None = None,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> Task:
    require_user_permission(actor, "tasks:approve")
    return await _approvals.decide(
        db,
        task_id=task_id,
        decision=ApprovalStatus.REJECTED,
        reviewer=actor.user_id,
        reason=body.reason if body else None,
    )


@router.get("/approvals", response_model=list[ApprovalOut])
async def list_approvals(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
) -> list[Approval]:
    require_user_permission(actor, "approvals:read")
    rows = (await db.execute(select(Approval).order_by(Approval.created_at.desc()).limit(100))).scalars().all()
    return list(rows)

