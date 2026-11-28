from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class AgentExecutionResult:
    """Structured output produced by a BaseAgent execution."""

    output: dict[str, Any]
    requires_approval: bool = True
    proposed_action: str = "execute"
    proposed_payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class VerificationResult:
    """Deterministic verification outcome before approval or completion."""

    verified: bool
    notes: str = "verified"


class BaseAgent(ABC):
    """Contract enforced for every agent in AI Commander."""

    agent_id: str
    requires_approval: bool = True

    @abstractmethod
    def validate_task(self, task_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Validate and normalize task input. Raise ValueError on invalid input."""

    @abstractmethod
    async def execute(self, task_type: str, payload: dict[str, Any]) -> AgentExecutionResult:
        """Run deterministic or LLM-drafted logic without mutating external state directly."""

    @abstractmethod
    def verify_result(self, result: AgentExecutionResult) -> VerificationResult:
        """Verify invariants on the produced output before HITL or completion."""

    def report_result(self, result: AgentExecutionResult, verification: VerificationResult) -> dict[str, Any]:
        """Format final structured evidence for persistence in task_results."""
        return {
            "agent_id": self.agent_id,
            "verified": verification.verified,
            "verification_notes": verification.notes,
            "output": result.output,
            "requires_approval": result.requires_approval,
        }


class DefaultDeterministicAgent(BaseAgent):
    """Phase 1 deterministic agent handler for registered domain agents."""

    def __init__(self, agent_id: str, requires_approval: bool = True) -> None:
        self.agent_id = agent_id
        self.requires_approval = requires_approval

    def validate_task(self, task_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("Task payload must be a JSON object")
        return payload

    async def execute(self, task_type: str, payload: dict[str, Any]) -> AgentExecutionResult:
        return AgentExecutionResult(
            output={"task_type": task_type, "echo": payload, "mode": "deterministic_proposal"},
            requires_approval=self.requires_approval,
            proposed_action=task_type,
            proposed_payload=payload,
        )

    def verify_result(self, result: AgentExecutionResult) -> VerificationResult:
        if not isinstance(result.output, dict):
            return VerificationResult(verified=False, notes="Output must be a dictionary")
        return VerificationResult(verified=True, notes="Deterministic schema check passed")

