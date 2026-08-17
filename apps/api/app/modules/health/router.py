from fastapi import APIRouter, Response
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
from app.modules.simulation.adapters import simulation_engine_statuses

router = APIRouter(tags=["health"])
EXPECTED_DATABASE_REVISION = "20260803_0003"


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


@router.get("/ready")
def readiness_check(response: Response) -> dict[str, object]:
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

    required_values = [checks["configuration"], checks["seed_data"]]
    if settings.database_readiness_required:
        required_values.extend(
            [checks["database"], checks["postgis"], checks["migrations"], checks["operational_data"]]
        )
    ready = all(value == "ok" for value in required_values)
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
            "model": settings.openai_model if settings.ai_provider == "openai" else None,
            "status": "configured" if settings.ai_provider == "openai" else "local_grounded_rag",
            "provider_response_store_requested": False,
        },
        "simulation_engines": simulation_engine_statuses(),
        "external_integrations": {
            "official_gis": "not_configured",
            "notifications": "not_configured",
            "object_storage": "not_configured",
        },
    }
