from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Customer, Order, Sale
from app.models.orchestration import Agent, Task, TaskResult, TaskStatus
from app.orchestrator.dispatcher import TaskDispatcher
from app.orchestrator.task_manager import TaskManager


@dataclass(frozen=True)
class KPIReport:
    """Data-integrity-safe KPI snapshot: returns None when underlying records are insufficient."""

    orders_count: int
    sales_count: int
    customers_count: int
    booked_revenue_minor: int | None
    conversion_rate: float | None
    data_sufficiency_notes: list[str]


class BusinessIntelligenceEngine:
    """Reads verified database KPIs and flags insufficient data instead of hallucinating."""

    async def snapshot(self, db: AsyncSession) -> KPIReport:
        orders_count = int((await db.execute(select(func.count()).select_from(Order))).scalar_one() or 0)
        sales_count = int((await db.execute(select(func.count()).select_from(Sale))).scalar_one() or 0)
        customers_count = int((await db.execute(select(func.count()).select_from(Customer))).scalar_one() or 0)
        total_revenue = (await db.execute(select(func.sum(Order.total_minor)))).scalar_one()

        notes: list[str] = []
        booked_revenue = int(total_revenue) if orders_count > 0 and total_revenue is not None else None
        if orders_count == 0:
            notes.append("No orders recorded; revenue KPI withheld.")

        conversion_rate: float | None = None
        if customers_count > 0 and orders_count > 0:
            conversion_rate = round(orders_count / customers_count, 4)
        else:
            notes.append("Insufficient customer/order records to compute conversion rate.")

        return KPIReport(
            orders_count=orders_count,
            sales_count=sales_count,
            customers_count=customers_count,
            booked_revenue_minor=booked_revenue,
            conversion_rate=conversion_rate,
            data_sufficiency_notes=notes,
        )


class TaskManagementEngine:
    """Creates and routes tasks through TaskManager + TaskDispatcher (never direct file calls)."""

    def __init__(self) -> None:
        self.manager = TaskManager()
        self.dispatcher = TaskDispatcher()

    async def create_and_dispatch(
        self,
        db: AsyncSession,
        *,
        agent_id: str,
        task_type: str,
        payload: dict[str, Any],
        created_by: str,
        idempotency_key: str,
        priority: int = 0,
    ) -> Task:
        task = await self.manager.create_task(
            db,
            agent_id=agent_id,
            task_type=task_type,
            payload=payload,
            priority=priority,
            created_by=created_by,
            idempotency_key=idempotency_key,
        )
        self.dispatcher.dispatch(task.id)
        return task


class AgentSupervisionEngine:
    """Monitors agent pause state, task counts, and failure rates."""

    async def health_summary(self, db: AsyncSession) -> dict[str, Any]:
        total_agents = int((await db.execute(select(func.count()).select_from(Agent).where(Agent.id != "global"))).scalar_one() or 0)
        paused_agents = int((await db.execute(select(func.count()).select_from(Agent).where(Agent.id != "global", Agent.is_paused.is_(True)))).scalar_one() or 0)
        failed_tasks = int((await db.execute(select(func.count()).select_from(Task).where(Task.status == TaskStatus.FAILED))).scalar_one() or 0)
        awaiting_approval = int((await db.execute(select(func.count()).select_from(Task).where(Task.status == TaskStatus.AWAITING_APPROVAL))).scalar_one() or 0)
        return {
            "total_agents": total_agents,
            "paused_agents": paused_agents,
            "failed_tasks": failed_tasks,
            "awaiting_approval": awaiting_approval,
        }


class DecisionSupportEngine:
    """Proposes structured alternatives for human decision-makers."""

    def propose_alternatives(self, kpi: KPIReport) -> list[dict[str, Any]]:
        if kpi.orders_count == 0:
            return [
                {"option": "import_historical_data", "impact": "Enables baseline KPIs", "requires_approval": False},
                {"option": "launch_controlled_outreach", "impact": "Generates initial lead responses", "requires_approval": True},
            ]
        return [
            {"option": "review_pending_approvals", "impact": "Unblocks queued agent actions", "requires_approval": True},
        ]


class ExecutionFollowUpEngine:
    """Verifies task closure and result verification status."""

    async def audit_open_or_unverified(self, db: AsyncSession) -> dict[str, Any]:
        unverified_results = int(
            (await db.execute(select(func.count()).select_from(TaskResult).where(TaskResult.verified.is_(False)))).scalar_one() or 0
        )
        pending_tasks = int(
            (await db.execute(select(func.count()).select_from(Task).where(Task.status.in_([TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.VERIFYING])))).scalar_one() or 0
        )
        return {"unverified_results": unverified_results, "in_flight_tasks": pending_tasks}


class GeneralManager:
    """Facade composing the 5 independent General Manager engines."""

    def __init__(self) -> None:
        self.bi = BusinessIntelligenceEngine()
        self.tasks = TaskManagementEngine()
        self.supervision = AgentSupervisionEngine()
        self.decisions = DecisionSupportEngine()
        self.followup = ExecutionFollowUpEngine()

    async def executive_overview(self, db: AsyncSession) -> dict[str, Any]:
        kpi = await self.bi.snapshot(db)
        supervision = await self.supervision.health_summary(db)
        followup = await self.followup.audit_open_or_unverified(db)
        return {
            "kpis": {
                "orders_count": kpi.orders_count,
                "sales_count": kpi.sales_count,
                "customers_count": kpi.customers_count,
                "booked_revenue_minor": kpi.booked_revenue_minor,
                "conversion_rate": kpi.conversion_rate,
                "data_sufficiency_notes": kpi.data_sufficiency_notes,
            },
            "supervision": supervision,
            "followup": followup,
            "decision_options": self.decisions.propose_alternatives(kpi),
        }

