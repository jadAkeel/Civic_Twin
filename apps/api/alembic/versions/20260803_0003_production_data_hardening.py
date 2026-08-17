"""Persist operational data and security controls.

Revision ID: 20260803_0003
Revises: 20260619_0002
Create Date: 2026-08-03
"""

from collections.abc import Sequence

from alembic import op
import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260803_0003"
down_revision: str | None = "20260619_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("token_version", sa.Integer(), server_default="0", nullable=False))
    op.add_column(
        "users",
        sa.Column("tenant_key", sa.String(length=80), server_default="citymind-tripoli", nullable=False),
    )
    op.create_index("ix_users_tenant_key", "users", ["tenant_key"])

    op.alter_column("issue_reports", "latitude", existing_type=sa.Numeric(9, 6), nullable=True)
    op.alter_column("issue_reports", "longitude", existing_type=sa.Numeric(9, 6), nullable=True)
    op.alter_column(
        "issue_reports",
        "location",
        existing_type=geoalchemy2.Geometry(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    op.alter_column("issue_reports", "neighborhood_id", existing_type=sa.Integer(), nullable=True)
    op.add_column("issue_reports", sa.Column("manual_location", sa.String(length=240), nullable=True))
    op.add_column(
        "issue_reports",
        sa.Column("location_source", sa.String(length=40), server_default="manual", nullable=False),
    )
    op.execute("UPDATE issue_reports SET location_source = 'demo_seed' WHERE source = 'demo_seed'")
    op.add_column(
        "issue_reports",
        sa.Column("image_upload_status", sa.String(length=40), server_default="none", nullable=False),
    )
    op.add_column(
        "issue_reports",
        sa.Column(
            "image_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "issue_reports",
        sa.Column("analysis_status", sa.String(length=40), server_default="not_configured", nullable=False),
    )
    op.add_column(
        "issue_reports",
        sa.Column(
            "image_analysis",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "issue_reports",
        sa.Column(
            "duplicate_candidates",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "issue_report_location_source_allowed",
        "issue_reports",
        "location_source IN ('gps', 'manual', 'map', 'demo_seed')",
    )
    op.create_check_constraint(
        "issue_report_image_upload_status_allowed",
        "issue_reports",
        "image_upload_status IN ('none', 'local_preview_only', 'stored')",
    )
    op.create_check_constraint(
        "issue_report_analysis_status_allowed",
        "issue_reports",
        "analysis_status IN ('not_configured', 'pending', 'completed', 'failed', 'manual_review_required')",
    )

    op.add_column(
        "ai_queries",
        sa.Column("provider", sa.String(length=80), server_default="local_grounded_rag", nullable=False),
    )
    op.add_column(
        "predictions",
        sa.Column(
            "provider",
            sa.String(length=80),
            server_default="transparent_rule_engine",
            nullable=False,
        ),
    )

    op.create_table(
        "rate_limit_buckets",
        sa.Column("key_hash", sa.String(length=64), primary_key=True),
        sa.Column("scope", sa.String(length=80), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("request_count", sa.Integer(), server_default="1", nullable=False),
    )
    op.create_index("ix_rate_limit_buckets_scope", "rate_limit_buckets", ["scope"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_email", sa.String(length=255), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=False),
        sa.Column("resource_id", sa.String(length=160), nullable=True),
        sa.Column("request_id", sa.String(length=128), nullable=True),
        sa.Column(
            "details_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_events_actor_email", "audit_events", ["actor_email"])
    op.create_index("ix_audit_events_action", "audit_events", ["action"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_action", table_name="audit_events")
    op.drop_index("ix_audit_events_actor_email", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_rate_limit_buckets_scope", table_name="rate_limit_buckets")
    op.drop_table("rate_limit_buckets")
    op.drop_column("ai_queries", "provider")
    op.drop_column("predictions", "provider")
    op.drop_constraint("issue_report_analysis_status_allowed", "issue_reports", type_="check")
    op.drop_constraint("issue_report_image_upload_status_allowed", "issue_reports", type_="check")
    op.drop_constraint("issue_report_location_source_allowed", "issue_reports", type_="check")
    op.drop_column("issue_reports", "duplicate_candidates")
    op.drop_column("issue_reports", "image_analysis")
    op.drop_column("issue_reports", "analysis_status")
    op.drop_column("issue_reports", "image_metadata")
    op.drop_column("issue_reports", "image_upload_status")
    op.drop_column("issue_reports", "location_source")
    op.drop_column("issue_reports", "manual_location")
    op.drop_index("ix_users_tenant_key", table_name="users")
    op.drop_column("users", "tenant_key")
    op.drop_column("users", "token_version")
    op.drop_column("users", "password_hash")
