from decimal import Decimal

from geoalchemy2 import Geometry
from sqlalchemy import CheckConstraint, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import MOBILITY_EDGE_TYPES


class MobilityEdge(TimestampMixin, Base):
    __tablename__ = "mobility_edges"
    __table_args__ = (
        CheckConstraint(f"edge_type IN {MOBILITY_EDGE_TYPES}", name="mobility_edge_type_allowed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    edge_type: Mapped[str] = mapped_column(String(40), nullable=False)
    from_label: Mapped[str | None] = mapped_column(String(120))
    to_label: Mapped[str | None] = mapped_column(String(120))
    geometry: Mapped[object] = mapped_column(Geometry("LINESTRING", srid=4326, spatial_index=True), nullable=False)
    length_meters: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    estimated_speed_kmh: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    walkability_weight: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    pollution_weight: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    safety_weight: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    accessibility_weight: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
