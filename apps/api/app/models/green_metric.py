from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GreenMetric(Base):
    __tablename__ = "green_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    neighborhood_id: Mapped[int] = mapped_column(ForeignKey("neighborhoods.id"), nullable=False, index=True)
    air_quality_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    green_coverage_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    waste_cleanliness_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    walkability_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    heat_comfort_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    overall_green_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    measurement_date: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    neighborhood = relationship("Neighborhood", back_populates="green_metrics")
