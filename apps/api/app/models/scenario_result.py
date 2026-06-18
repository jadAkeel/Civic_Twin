from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id"), nullable=False, unique=True, index=True)
    green_score_delta: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    temperature_delta: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    air_quality_delta: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    walkability_delta: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    traffic_delta: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    pollution_delta: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    estimated_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    implementation_time_days: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(40), nullable=False)
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    result_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    scenario = relationship("Scenario", back_populates="result")
