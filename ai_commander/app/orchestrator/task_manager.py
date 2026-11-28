import hashlib
import json
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.registry import registry
from app.approvals.engine import ApprovalEngine
from app.models.orchestration import (
    AuditLog,
    Task,
    TaskEvent,
    TaskResult,
    TaskStatus,
)


def _request_hash(agent_id: str, task_type: str, payload: dict) -> str:
    canonical = json.dumps({"agent_id": agent_id, "task_type": task_type, "payload": payload}, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


class TaskManager:
    """Deterministic state-machine engine for task creation, execution, and verification."""

    def __init__(self) -> None:
        self.approvals = ApprovalEngine()

    async def _transition(
        self,
        db: AsyncSession,
        task: Task,
        to_status: TaskStatus,
        actor: str,
        details: dict | None = None,
    ) -> None:
        from_status = task.status
        task.status = to_status
        db.add(
            TaskEvent(
                task_id=task.id,
                from_status=from_status,
                to_status=to_status,
                actor=actor,
                details=details or {},
            )
        )

    async def create_task(
        self,
        db: AsyncSession,
        *,
        agent_id: str,
        task_type: str,
        payload: dict,
        priority: int,
        created_by: str,
        idempotency_key: str,
    ) -> Task:
        req_hash = _request_hash(agent_id, task_type, payload)
        existing = (await db.execute(select(Task).where(Task.idempotency_key == idempotency_key))).scalar_one_or_none()
        if existing:
            if existing.request_hash != req_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency-Key already used with a different request payload",
                )
            return existing

        agent = registry.get(agent_id)
        validated_payload = agent.validate_task(task_type, payload)

        task = Task(
            idempotency_key=idempotency_key,
            request_hash=req_hash,
            agent_id=agent_id,
            task_type=task_type,
            status=TaskStatus.PENDING,
            priority=priority,
            payload=validated_payload,
            created_by=created_by,
        )
        db.add(task)
        await db.flush()
        db.add(
            TaskEvent(
                task_id=task.id,
                from_status=None,
                to_status=TaskStatus.PENDING,
                actor=created_by,
                details={"task_type": task_type, "agent_id": agent_id},
            )
        )
        db.add(
            AuditLog(
                actor=created_by,
                action="task.created",
                resource_type="task",
                resource_id=task.id,
                details={"agent_id": agent_id, "task_type": task_type},
            )
        )
        await db.commit()
        await db.refresh(task)
        return task

    async def execute_task(self, db: AsyncSession, task_id: str) -> Task:
        """Run PENDING -> RUNNING -> VERIFYING -> AWAITING_APPROVAL | COMPLETED | FAILED."""
        task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        if task.status != TaskStatus.PENDING:
            return task

        actor = f"agent:{task.agent_id}"
        try:
            task.attempts += 1
            await self._transition(db, task, TaskStatus.RUNNING, actor)
            await db.flush()

            agent = registry.get(task.agent_id)
            exec_result = await agent.execute(task.task_type, task.payload)

            await self._transition(db, task, TaskStatus.VERIFYING, actor)
            verification = agent.verify_result(exec_result)
            report = agent.report_result(exec_result, verification)

            db.add(
                TaskResult(
                    task_id=task.id,
                    verified=verification.verified,
                    verification_notes=verification.notes,
                    output=report,
                )
            )

            if not verification.verified:
                task.last_error = verification.notes
                await self._transition(db, task, TaskStatus.FAILED, actor, {"reason": verification.notes})
            elif exec_result.requires_approval:
                await self.approvals.create_approval(
                    db,
                    task,
                    exec_result.proposed_action,
                    exec_result.proposed_payload,
                )
                await self._transition(db, task, TaskStatus.AWAITING_APPROVAL, actor)
            else:
                await self._transition(db, task, TaskStatus.COMPLETED, actor)

            await db.commit()
        except Exception as exc:
            await db.rollback()
            task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one()
            task.last_error = str(exc)
            await self._transition(db, task, TaskStatus.FAILED, actor, {"error": str(exc)})
            await db.commit()
        await db.refresh(task)
        return task

