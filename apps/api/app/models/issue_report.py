from datetime import datetime
from decimal import Decimal

from geoalchemy2 import Geometry
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import REPORT_CATEGORIES, REPORT_SEVERITIES, REPORT_SOURCES, REPORT_STATUSES


class IssueReport(TimestampMixin, Base):
    __tablename__ = "issue_reports"
    __table_args__ = (
        CheckConstraint(f"category IN {REPORT_CATEGORIES}", name="issue_report_category_allowed"),
        CheckConstraint(f"severity IN {REPORT_SEVERITIES}", name="issue_report_severity_allowed"),
        CheckConstraint(f"status IN {REPORT_STATUSES}", name="issue_report_status_allowed"),
        CheckConstraint(f"source IN {REPORT_SOURCES}", name="issue_report_source_allowed"),
        CheckConstraint(
            "location_source IN ('gps', 'manual', 'map', 'demo_seed')",
            name="issue_report_location_source_allowed",
        ),
        CheckConstraint(
            "image_upload_status IN ('none', 'local_preview_only', 'stored')",
            name="issue_report_image_upload_status_allowed",
        ),
        CheckConstraint(
            "analysis_status IN ('not_configured', 'pending', 'completed', 'failed', 'manual_review_required')",
            name="issue_report_analysis_status_allowed",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="submitted")
    source: Mapped[str] = mapped_column(String(40), nullable=False, default="demo_seed")
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    location: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326, spatial_index=True))
    manual_location: Mapped[str | None] = mapped_column(String(240))
    location_source: Mapped[str] = mapped_column(
        String(40), nullable=False, default="manual", server_default="manual"
    )
    image_url: Mapped[str | None] = mapped_column(String(500))
    image_upload_status: Mapped[str] = mapped_column(
        String(40), nullable=False, default="none", server_default="none"
    )
    image_metadata: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    analysis_status: Mapped[str] = mapped_column(
        String(40), nullable=False, default="not_configured", server_default="not_configured"
    )
    image_analysis: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    ai_detected_category: Mapped[str | None] = mapped_column(String(60))
    ai_confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    duplicate_group_id: Mapped[str | None] = mapped_column(String(120), index=True)
    duplicate_candidates: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    neighborhood_id: Mapped[int | None] = mapped_column(ForeignKey("neighborhoods.id"), index=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    neighborhood = relationship("Neighborhood", back_populates="reports")
    created_by = relationship("User", back_populates="reports")
