from geoalchemy2 import Geometry
from sqlalchemy import CheckConstraint, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ASSET_STATUSES, ASSET_TYPES


class CityAsset(TimestampMixin, Base):
    __tablename__ = "city_assets"
    __table_args__ = (
        CheckConstraint(f"asset_type IN {ASSET_TYPES}", name="city_asset_type_allowed"),
        CheckConstraint(f"status IN {ASSET_STATUSES}", name="city_asset_status_allowed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    neighborhood_id: Mapped[int | None] = mapped_column(ForeignKey("neighborhoods.id"), index=True)
    location: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326, spatial_index=True))
    geometry: Mapped[object | None] = mapped_column(Geometry("GEOMETRY", srid=4326, spatial_index=True))
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))

    neighborhood = relationship("Neighborhood", back_populates="assets")
