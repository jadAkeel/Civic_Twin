import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.middleware import RequestContextMiddleware
from app.modules.admin.router import router as admin_router
from app.modules.assistant.router import router as assistant_router
from app.modules.auth.router import router as auth_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.green_score.router import router as green_score_router
from app.modules.health.router import router as health_router
from app.modules.mobility.router import router as mobility_router
from app.modules.predictions.router import router as predictions_router
from app.modules.reports.router import router as reports_router
from app.modules.scenarios.router import router as scenarios_router
from app.modules.walkability.router import router as walkability_router


def create_app() -> FastAPI:
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    application = FastAPI(
        title=settings.project_name,
        version=settings.version,
        description="CityMind Tripoli municipal operations API.",
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )

    application.add_middleware(RequestContextMiddleware)
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    application.include_router(health_router)
    application.include_router(reports_router)
    application.include_router(dashboard_router)
    application.include_router(green_score_router)
    application.include_router(walkability_router)
    application.include_router(mobility_router)
    application.include_router(scenarios_router)
    application.include_router(predictions_router)
    application.include_router(assistant_router)
    application.include_router(auth_router)
    application.include_router(admin_router)
    return application


app = create_app()
