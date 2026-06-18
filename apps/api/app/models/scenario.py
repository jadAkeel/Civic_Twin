from sqlalchemy import CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import SCENARIO_STATUSES, SCENARIO_TYPES


class Scenario(TimestampMixin, Base):
    __tablename__ = "scenarios"
    __table_args__ = (
        CheckConstraint(f"scenario_type IN {SCENARIO_TYPES}", name="scenario_type_allowed"),
        CheckConstraint(f"status IN {SCENARIO_STATUSES}", name="scenario_status_allowed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    neighborhood_id: Mapped[int] = mapped_column(ForeignKey("neighborhoods.id"), nullable=False, index=True)
    scenario_type: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="draft")
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)

    neighborhood = relationship("Neighborhood", back_populates="scenarios")
    created_by = relationship("User", back_populates="scenarios")
    actions = relationship("ScenarioAction", back_populates="scenario", cascade="all, delete-orphan")
    result = relationship("ScenarioResult", back_populates="scenario", uselist=False, cascade="all, delete-orphan")
