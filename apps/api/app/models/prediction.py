from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PREDICTION_TYPES, REPORT_SEVERITIES


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        CheckConstraint(f"prediction_type IN {PREDICTION_TYPES}", name="prediction_type_allowed"),
        CheckConstraint(f"severity IN {REPORT_SEVERITIES}", name="prediction_severity_allowed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    prediction_type: Mapped[str] = mapped_column(String(80), nullable=False)
    neighborhood_id: Mapped[int | None] = mapped_column(ForeignKey("neighborhoods.id"), index=True)
    target_asset_id: Mapped[int | None] = mapped_column(ForeignKey("city_assets.id"), index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    prediction_window_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    neighborhood = relationship("Neighborhood", back_populates="predictions")
    target_asset = relationship("CityAsset")
