import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import ErrorLoggingMiddleware
from app.db.base import Base
from app.db.session import engine
from app.websocket.gateway import websocket_endpoint

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Configure logging first so every subsequent message is formatted
    configure_logging(
        level="DEBUG" if settings.is_development else "INFO",
        use_colour=True,
    )

    logger.info(
        "Starting %s v%s  [env=%s]",
        settings.app_name,
        settings.app_version,
        settings.environment,
    )

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified / created")
    except Exception:
        logger.exception("FATAL: could not create database tables — check DATABASE_URL")
        raise

    # Warn loudly when the placeholder secret is used
    _PLACEHOLDER = "change-me-generate-with-openssl-rand-hex-32"
    if settings.secret_key in (_PLACEHOLDER, "change-me-in-production"):
        msg = (
            "SECRET_KEY is set to a known placeholder value. "
            "Generate a real secret with: openssl rand -hex 32"
        )
        if settings.is_development:
            logger.warning("⚠️  SECURITY WARNING: %s", msg)
        else:
            logger.error("FATAL: %s", msg)
            raise RuntimeError(msg)

    yield

    await engine.dispose()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Autonomous Inventory Management Platform - Backend Orchestration Layer",
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    # ── Middleware (order matters: first added = outermost) ─────────────────
    app.add_middleware(ErrorLoggingMiddleware)          # catches all exceptions
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    app.websocket("/ws")(websocket_endpoint)

    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": settings.app_version}

    return app


app = create_app()
