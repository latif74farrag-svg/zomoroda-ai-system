import logging
import structlog

from app.core.config import get_settings


def configure_logging() -> None:
    """Configure structured JSON logging and optional Sentry reporting."""
    settings = get_settings()

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )

    if settings.sentry_dsn:
        import sentry_sdk  # Optional; zero cost when SENTRY_DSN is unset

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
        )


def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)

