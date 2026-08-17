from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ScenarioAction(Base):
    __tablename__ = "scenario_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(80), nullable=False)
    parameters_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    target_geometry: Mapped[object | None] = mapped_column(Geometry("GEOMETRY", srid=4326, spatial_index=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    scenario = relationship("Scenario", back_populates="actions")
