from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orchestration import (
    Approval,
    ApprovalHistory,
    ApprovalStatus,
    AuditLog,
    Task,
    TaskEvent,
    TaskStatus,
)


def guardian_check(action: str, payload: dict) -> tuple[str, list[str]]:
    """Deterministic compliance gate before presenting proposals to humans."""
    reasons: list[str] = []
    if not action:
        reasons.append("Missing proposed action")
        return "block", reasons
    if payload.get("bypass_policy"):
        reasons.append("Policy bypass is forbidden")
        return "block", reasons
    return "pass", reasons


class ApprovalEngine:
    """Manages HITL approval requests, decisions, and immutable history."""

    async def create_approval(
        self,
        db: AsyncSession,
        task: Task,
        action: str,
        proposed_payload: dict,
    ) -> Approval:
        verdict, reasons = guardian_check(action, proposed_payload)
        if verdict == "block":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Guardian blocked proposal: {', '.join(reasons)}",
            )

        approval = Approval(
            task_id=task.id,
            agent_id=task.agent_id,
            action=action,
            status=ApprovalStatus.PENDING,
            proposed_payload=proposed_payload,
            guardian_verdict=verdict,
            guardian_reasons=reasons,
        )
        db.add(approval)
        await db.flush()
        db.add(
            ApprovalHistory(
                approval_id=approval.id,
                decision=ApprovalStatus.PENDING,
                actor=f"agent:{task.agent_id}",
                reason="Awaiting human approval",
            )
        )
        return approval

    async def decide(
        self,
        db: AsyncSession,
        task_id: str,
        decision: ApprovalStatus,
        reviewer: str,
        reason: str | None = None,
    ) -> Task:
        if decision not in (ApprovalStatus.APPROVED, ApprovalStatus.REJECTED):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid approval decision")

        task = (await db.execute(select(Task).where(Task.id == task_id))).scalar_one_or_none()
        if not task or task.status != TaskStatus.AWAITING_APPROVAL:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Task is not awaiting approval")

        approval = (await db.execute(select(Approval).where(Approval.task_id == task_id))).scalar_one_or_none()
        if not approval or approval.status != ApprovalStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Approval record is missing or already decided")

        now = datetime.now(timezone.utc)
        approval.status = decision
        approval.reviewed_by = reviewer
        approval.reviewed_at = now
        db.add(
            ApprovalHistory(
                approval_id=approval.id,
                decision=decision,
                actor=reviewer,
                reason=reason,
            )
        )

        next_status = TaskStatus.COMPLETED if decision == ApprovalStatus.APPROVED else TaskStatus.REJECTED
        prev_status = task.status
        task.status = next_status
        db.add(
            TaskEvent(
                task_id=task.id,
                from_status=prev_status,
                to_status=next_status,
                actor=reviewer,
                details={"approval_id": approval.id, "decision": decision, "reason": reason},
            )
        )
        db.add(
            AuditLog(
                actor=reviewer,
                action=f"task.{decision.lower()}",
                resource_type="task",
                resource_id=task.id,
                details={"approval_id": approval.id, "reason": reason},
            )
        )
        await db.commit()
        await db.refresh(task)
        return task

