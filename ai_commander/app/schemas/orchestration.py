from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class AgentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    department: str
    kind: str
    is_paused: bool
    paused_reason: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)


class AgentRunRequest(BaseModel):
    task_type: str = Field(min_length=2, max_length=120)
    payload: dict[str, Any] = Field(default_factory=dict)
    priority: int = Field(default=0, ge=0, le=10)


class TaskCreateRequest(BaseModel):
    agent_id: str = Field(min_length=2, max_length=64)
    task_type: str = Field(min_length=2, max_length=120)
    payload: dict[str, Any] = Field(default_factory=dict)
    priority: int = Field(default=0, ge=0, le=10)


class TaskEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_status: str | None
    to_status: str
    actor: str
    details: dict[str, Any]
    created_at: datetime


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    idempotency_key: str
    agent_id: str
    task_type: str
    status: str
    priority: int
    payload: dict[str, Any]
    created_by: str
    attempts: int
    last_error: str | None = None
    created_at: datetime
    updated_at: datetime


class TaskDetailOut(TaskOut):
    events: list[TaskEventOut] = Field(default_factory=list)
    result: dict[str, Any] | None = None


class ApprovalDecisionRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class ApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    agent_id: str
    action: str
    status: str
    proposed_payload: dict[str, Any]
    guardian_verdict: str
    guardian_reasons: list[str]
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime

