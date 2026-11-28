from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Actor
from app.models.orchestration import Agent, AgentPermission


def require_user_permission(actor: Actor, permission: str) -> None:
    """Validate that the human actor holds the required RBAC permission."""
    if permission not in actor.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User lacks required permission: {permission}",
        )


async def require_agent_permission(db: AsyncSession, agent_id: str, action: str) -> None:
    """Validate that the agent exists, is active, and holds explicit DB permission for the action."""
    global_row = (await db.execute(select(Agent).where(Agent.id == "global"))).scalar_one_or_none()
    if global_row and global_row.is_paused:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Global agent kill switch is active")

    agent = (await db.execute(select(Agent).where(Agent.id == agent_id))).scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Agent '{agent_id}' not found")
    if agent.is_paused:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Agent '{agent_id}' is paused")

    perm = (
        await db.execute(
            select(AgentPermission).where(
                AgentPermission.agent_id == agent_id,
                AgentPermission.action == action,
                AgentPermission.allowed.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Agent '{agent_id}' is not permitted to perform '{action}'",
        )


async def validate_dual_permissions(
    db: AsyncSession,
    actor: Actor,
    user_permission: str,
    agent_id: str,
    agent_action: str,
) -> None:
    """Enforce both human user RBAC and agent DB-backed permissions."""
    require_user_permission(actor, user_permission)
    await require_agent_permission(db, agent_id, agent_action)

