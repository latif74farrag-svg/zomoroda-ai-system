from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Al Zomoroda AI Commander"
    environment: str = "development"
    debug: bool = False

    database_url: str = "sqlite+aiosqlite:///./ai_commander.db"
    sync_database_url: str = "sqlite:///./ai_commander.db"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    celery_task_always_eager: bool = False
    queue_mode: str = "eager"  # "eager" (free single-process asyncio) | "celery" (Redis + Celery worker)

    secret_key: str = "dev-insecure-secret-change-in-production"
    sentry_dsn: str = ""

    # Cost & AI guardrails (aligned with zero-paid-AI default)
    ai_enabled: bool = False
    ai_daily_call_limit: int = 0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

