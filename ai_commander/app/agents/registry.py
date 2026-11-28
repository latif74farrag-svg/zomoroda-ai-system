from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base_agent import BaseAgent, DefaultDeterministicAgent
from app.models.orchestration import Agent, AgentPermission

ROSTER_SEED: list[dict[str, str]] = [
    {"id": "global", "name": "Global Kill Switch", "department": "governance", "kind": "control"},
    {"id": "manager", "name": "General Manager", "department": "executive", "kind": "queue"},
    {"id": "marketing", "name": "Marketing Agent", "department": "growth", "kind": "queue"},
    {"id": "advertising", "name": "Advertising Agent", "department": "growth", "kind": "queue"},
    {"id": "sales", "name": "Sales Agent", "department": "sales", "kind": "queue"},
    {"id": "orders", "name": "Orders Agent", "department": "operations", "kind": "queue"},
    {"id": "inventory", "name": "Inventory Agent", "department": "operations", "kind": "queue"},
    {"id": "support", "name": "Support Agent", "department": "support", "kind": "queue"},
    {"id": "mamiz", "name": "Mamiz Affiliate Agent", "department": "sales", "kind": "queue"},
    {"id": "data_quality", "name": "Data Quality Agent", "department": "growth", "kind": "queue"},
    {"id": "order_intake", "name": "Order Intake Agent", "department": "channels", "kind": "queue"},
    {"id": "communication", "name": "Outreach & Comms Agent", "department": "growth", "kind": "queue"},
    {"id": "whatsapp", "name": "WhatsApp Agent", "department": "channels", "kind": "standalone"},
    {"id": "email", "name": "Email Agent", "department": "channels", "kind": "queue"},
    {"id": "social", "name": "Social Agent", "department": "channels", "kind": "queue"},
    {"id": "research", "name": "Market Research Agent", "department": "growth", "kind": "standalone"},
    {"id": "pricing", "name": "Pricing & Margin Agent", "department": "finance", "kind": "queue"},
    {"id": "business_intelligence", "name": "Business Intelligence Agent", "department": "analytics", "kind": "queue"},
    {"id": "crm", "name": "CRM Agent", "department": "sales", "kind": "queue"},
    {"id": "distribution", "name": "Distribution Agent", "department": "operations", "kind": "queue"},
    {"id": "procurement", "name": "Procurement Agent", "department": "operations", "kind": "queue"},
]


class AgentRegistry:
    """In-memory runtime registry mapping agent IDs to BaseAgent implementations."""

    def __init__(self) -> None:
        self._agents: dict[str, BaseAgent] = {
            item["id"]: DefaultDeterministicAgent(item["id"])
            for item in ROSTER_SEED
            if item["id"] != "global"
        }

    def register(self, agent: BaseAgent) -> None:
        self._agents[agent.agent_id] = agent

    def get(self, agent_id: str) -> BaseAgent:
        if agent_id not in self._agents:
            raise KeyError(f"Agent '{agent_id}' is not registered")
        return self._agents[agent_id]

    def list_ids(self) -> list[str]:
        return sorted(self._agents.keys())


registry = AgentRegistry()


async def seed_roster(db: AsyncSession, *, global_paused: bool = True, default_actions: tuple[str, ...] = ("task.run",)) -> None:
    """Idempotently seed the 20-agent roster and default permissions."""
    for item in ROSTER_SEED:
        existing = (await db.execute(select(Agent).where(Agent.id == item["id"]))).scalar_one_or_none()
        if not existing:
            db.add(
                Agent(
                    id=item["id"],
                    name=item["name"],
                    department=item["department"],
                    kind=item["kind"],
                    is_paused=global_paused if item["id"] == "global" else False,
                    config={},
                )
            )
            if item["id"] != "global":
                for action in default_actions:
                    db.add(AgentPermission(agent_id=item["id"], action=action, allowed=True))
    await db.commit()

