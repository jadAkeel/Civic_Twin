from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.middleware import BodySizeLimitMiddleware, RequestContextMiddleware, apply_security_headers
from app.core.monitoring import init_monitoring
from app.db.session import dispose_engine
from app.modules.admin.public_assets import router as public_assets_router
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
from app.modules.telemetry.router import router as telemetry_router
from app.modules.walkability.router import router as walkability_router


logger = logging.getLogger("citymind.api")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "api_starting env=%s persistence=%s rate_limit=%s ai_provider=%s",
        settings.app_env,
        settings.operational_persistence_backend,
        settings.rate_limit_backend,
        settings.ai_provider,
    )
    if settings.allow_demo_users:
        logger.warning(
            "demo_accounts_enabled: publicly documented demo passwords are active. "
            "Never run with ALLOW_DEMO_USERS=true outside local development."
        )
    try:
        yield
    finally:
        dispose_engine()
        logger.info("api_stopped")


def _error_response(
    request: Request,
    status_code: int,
    detail: object,
    extra: dict[str, object] | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    payload: dict[str, object] = {"detail": detail, "request_id": request_id}
    if extra:
        payload.update(extra)
    response = JSONResponse(status_code=status_code, content=payload)
    apply_security_headers(response, request, request_id or "")
    return response


def register_exception_handlers(application: FastAPI) -> None:
    @application.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        response = _error_response(request, exc.status_code, exc.detail)
        for key, value in (exc.headers or {}).items():
            response.headers[key] = value
        return response

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Field errors are safe to return; the raw submitted values are not.
        details = [
            {"field": ".".join(str(part) for part in error.get("loc", ())[1:]), "message": error.get("msg", "")}
            for error in exc.errors()
        ]
        first = details[0]["message"] if details else "The submitted data is invalid"
        return _error_response(request, 422, first, {"errors": details})

    @application.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.exception("database_error path=%s", request.url.path, exc_info=exc)
        return _error_response(request, 503, "A storage dependency is temporarily unavailable")

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error path=%s", request.url.path, exc_info=exc)
        return _error_response(request, 500, "An unexpected error occurred")


def create_app() -> FastAPI:
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    init_monitoring()

    application = FastAPI(
        title=settings.project_name,
        version=settings.version,
        description="CityMind Tripoli municipal operations API.",
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
        lifespan=lifespan,
    )

    # Middleware runs in reverse registration order, so the request context (and its
    # request id) wraps everything added before it.
    application.add_middleware(GZipMiddleware, minimum_size=1024)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )
    application.add_middleware(BodySizeLimitMiddleware)
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
    application.add_middleware(RequestContextMiddleware)

    register_exception_handlers(application)

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
    application.include_router(public_assets_router)
    application.include_router(telemetry_router)
    return application


app = create_app()
