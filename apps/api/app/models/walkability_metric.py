from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WalkabilityMetric(Base):
    __tablename__ = "walkability_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    neighborhood_id: Mapped[int] = mapped_column(ForeignKey("neighborhoods.id"), nullable=False, index=True)
    sidewalk_quality: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    crossing_safety: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    lighting_quality: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    accessibility_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    slope_comfort: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    perceived_safety: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    overall_walkability_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    measurement_date: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    neighborhood = relationship("Neighborhood", back_populates="walkability_metrics")
