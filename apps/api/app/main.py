from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.admin.router import router as admin_router
from app.core.config import settings
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


app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="Phase 1 FastAPI foundation for CityMind Tripoli.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
app.include_router(green_score_router)
app.include_router(walkability_router)
app.include_router(mobility_router)
app.include_router(scenarios_router)
app.include_router(predictions_router)
app.include_router(assistant_router)
app.include_router(auth_router)
app.include_router(admin_router)
