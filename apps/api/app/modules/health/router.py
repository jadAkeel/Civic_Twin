import time
from threading import Lock
from typing import Any

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.seed import seed_path
from app.db.health import (
    check_database_connection,
    check_migration_current,
    check_operational_data,
    check_postgis_extension,
)
from app.db.session import engine
from app.modules.auth.router import require_roles
from app.modules.simulation.adapters import simulation_engine_statuses

router = APIRouter(tags=["health"])
EXPECTED_DATABASE_REVISION = "20260923_0006"
# /ready is unauthenticated and polled by load balancers and uptime checks; the
# four database probes are cached briefly so it cannot be used to load the DB.
READINESS_CACHE_SECONDS = 5.0
_readiness_cache: tuple[float, dict[str, object]] | None = None
_readiness_lock = Lock()
READINESS_DETAIL_ROLES = ("owner", "municipality_admin")


def _ai_status() -> str:
    """Report whether the selected hosted provider actually has a server-side key."""
    if settings.ai_provider == "local_rag":
        return "local_grounded_rag"
    key = settings.ai_api_key
    return "configured" if key and key.get_secret_value().strip() else "missing_api_key"


@router.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.service_name,
        "project": settings.project_name,
        "city": f"{settings.city_name}, {settings.country_name}",
        "environment": settings.app_env,
        "version": settings.version,
    }


def _readiness_checks() -> dict[str, object]:
    global _readiness_cache
    now = time.monotonic()
    with _readiness_lock:
        if _readiness_cache is not None and now - _readiness_cache[0] < READINESS_CACHE_SECONDS:
            return dict(_readiness_cache[1])
    checks: dict[str, object] = {
        "configuration": "ok",
        "seed_data": "ok" if seed_path().is_file() else "unavailable",
        "database": "not_required",
        "postgis": "not_required",
        "migrations": "not_required",
        "operational_data": "not_required",
    }

    if settings.database_readiness_required:
        try:
            with Session(engine) as db:
                checks["database"] = "ok" if check_database_connection(db) else "unavailable"
                checks["postgis"] = "ok" if check_postgis_extension(db) else "unavailable"
                checks["migrations"] = (
                    "ok" if check_migration_current(db, EXPECTED_DATABASE_REVISION) else "outdated"
                )
                checks["operational_data"] = "ok" if check_operational_data(db) else "incomplete"
        except Exception:
            checks["database"] = "unavailable"
            checks["postgis"] = "unavailable"
            checks["migrations"] = "unavailable"
            checks["operational_data"] = "unavailable"
    with _readiness_lock:
        _readiness_cache = (now, dict(checks))
    return checks


def _is_ready(checks: dict[str, object]) -> bool:
    required_values = [checks["configuration"], checks["seed_data"]]
    if settings.database_readiness_required:
        required_values.extend(
            [checks["database"], checks["postgis"], checks["migrations"], checks["operational_data"]]
        )
    return all(value == "ok" for value in required_values)


@router.get("/ready")
def readiness_check(response: Response) -> dict[str, object]:
    """Public probe: only whether the service is ready and which checks pass.

    Configuration details (AI provider and model, demo-account mode, persistence
    backends) help an attacker plan and are served by /ready/details to staff only.
    """
    checks = _readiness_checks()
    ready = _is_ready(checks)
    if not ready:
        response.status_code = 503
    return {"status": "ready" if ready else "not_ready", "service": settings.service_name, "checks": checks}


@router.get("/ready/details")
def readiness_details(
    response: Response,
    _: dict[str, Any] = Depends(require_roles(*READINESS_DETAIL_ROLES)),
) -> dict[str, object]:
    checks = _readiness_checks()
    ready = _is_ready(checks)
    if not ready:
        response.status_code = 503
    return {
        "status": "ready" if ready else "not_ready",
        "service": settings.service_name,
        "environment": settings.app_env,
        "checks": checks,
        "runtime_data_mode": (
            "database_with_seeded_demo_baseline"
            if settings.operational_persistence_backend == "database"
            else "demo_seed_and_in_memory"
        ),
        "persistence": {
            "scenarios": settings.scenario_persistence_backend,
            "reports": settings.operational_persistence_backend,
            "users": settings.operational_persistence_backend,
            "assets": settings.operational_persistence_backend,
            "assistant_history": settings.operational_persistence_backend,
            "rate_limits": settings.rate_limit_backend,
        },
        "ai": {
            "provider": settings.ai_provider,
            "model": settings.ai_model,
            "status": _ai_status(),
            "local_fallback_enabled": settings.ai_allow_local_fallback,
            "provider_response_store_requested": False,
        },
        "identity": {
            "demo_accounts_enabled": settings.allow_demo_users,
            "bootstrap_owner_configured": bool(settings.bootstrap_owner_email),
        },
        "simulation_engines": simulation_engine_statuses(),
        "external_integrations": {
            "official_gis": "not_configured",
            "notifications": "not_configured",
            "object_storage": "not_configured",
        },
    }
