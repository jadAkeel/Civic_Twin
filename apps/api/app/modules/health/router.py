from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


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

