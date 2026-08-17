from geoalchemy2 import Geometry
from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Neighborhood(TimestampMixin, Base):
    __tablename__ = "neighborhoods"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False, default="Tripoli")
    country: Mapped[str] = mapped_column(String(120), nullable=False, default="Lebanon")
    center_point: Mapped[object] = mapped_column(Geometry("POINT", srid=4326, spatial_index=True), nullable=False)
    boundary: Mapped[object | None] = mapped_column(Geometry("POLYGON", srid=4326, spatial_index=True))
    population_estimate: Mapped[int | None] = mapped_column(Integer)
    priority_level: Mapped[str] = mapped_column(String(40), nullable=False, default="medium")

    reports = relationship("IssueReport", back_populates="neighborhood")
    assets = relationship("CityAsset", back_populates="neighborhood")
    green_metrics = relationship("GreenMetric", back_populates="neighborhood")
    walkability_metrics = relationship("WalkabilityMetric", back_populates="neighborhood")
    scenarios = relationship("Scenario", back_populates="neighborhood")
    predictions = relationship("Prediction", back_populates="neighborhood")
