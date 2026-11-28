import asyncio
from celery import Celery

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.orchestrator.task_manager import TaskManager

settings = get_settings()

celery_app = Celery(
    "ai_commander",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_always_eager=settings.celery_task_always_eager,
)


@celery_app.task(name="ai_commander.execute_task")
def execute_task_job(task_id: str) -> str:
    """Celery worker entrypoint executing a persisted PostgreSQL task."""

    async def _run() -> str:
        async with AsyncSessionLocal() as session:
            task = await TaskManager().execute_task(session, task_id)
            return task.status

    return asyncio.run(_run())


class TaskDispatcher:
    """Dispatches persisted tasks via Celery or free in-process asyncio without direct agent-to-agent calls."""

    def dispatch(self, task_id: str) -> None:
        if get_settings().queue_mode == "celery":
            execute_task_job.delay(task_id)
            return

        async def _run_local() -> None:
            async with AsyncSessionLocal() as session:
                await TaskManager().execute_task(session, task_id)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_run_local())
        except RuntimeError:
            asyncio.run(_run_local())

