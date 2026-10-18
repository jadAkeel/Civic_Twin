"""Indexes for the operational queries that run on every dashboard and report page.

Revision ID: 20260922_0004
Revises: 20260803_0003
Create Date: 2026-09-22
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260922_0004"
down_revision: str | None = "20260803_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Report feeds filter on status/category/severity and always sort newest first.
    op.create_index("ix_issue_reports_status", "issue_reports", ["status"])
    op.create_index("ix_issue_reports_category", "issue_reports", ["category"])
    op.create_index("ix_issue_reports_severity", "issue_reports", ["severity"])
    op.create_index(
        "ix_issue_reports_created_at_desc",
        "issue_reports",
        [sa.text("created_at DESC"), sa.text("id DESC")],
    )
    # Duplicate detection looks up open reports of the same category in one area.
    op.create_index(
        "ix_issue_reports_duplicate_lookup",
        "issue_reports",
        ["neighborhood_id", "category", "status"],
    )
    # "My reports" for a signed-in citizen.
    op.create_index(
        "ix_issue_reports_created_by_created_at",
        "issue_reports",
        ["created_by_id", sa.text("created_at DESC")],
    )
    # Latest-metric-per-neighborhood lookups used by scores, scenarios and the snapshot.
    op.create_index(
        "ix_green_metrics_neighborhood_measured",
        "green_metrics",
        ["neighborhood_id", sa.text("measurement_date DESC"), sa.text("id DESC")],
    )
    op.create_index(
        "ix_walkability_metrics_neighborhood_measured",
        "walkability_metrics",
        ["neighborhood_id", sa.text("measurement_date DESC"), sa.text("id DESC")],
    )
    # Scenario history listing.
    op.create_index(
        "ix_scenario_results_created_at_desc",
        "scenario_results",
        [sa.text("created_at DESC"), sa.text("id DESC")],
    )
    # Expired rate-limit buckets are swept in the background.
    op.create_index("ix_rate_limit_buckets_window_started_at", "rate_limit_buckets", ["window_started_at"])


def downgrade() -> None:
    op.drop_index("ix_rate_limit_buckets_window_started_at", table_name="rate_limit_buckets")
    op.drop_index("ix_scenario_results_created_at_desc", table_name="scenario_results")
    op.drop_index("ix_walkability_metrics_neighborhood_measured", table_name="walkability_metrics")
    op.drop_index("ix_green_metrics_neighborhood_measured", table_name="green_metrics")
    op.drop_index("ix_issue_reports_created_by_created_at", table_name="issue_reports")
    op.drop_index("ix_issue_reports_duplicate_lookup", table_name="issue_reports")
    op.drop_index("ix_issue_reports_created_at_desc", table_name="issue_reports")
    op.drop_index("ix_issue_reports_severity", table_name="issue_reports")
    op.drop_index("ix_issue_reports_category", table_name="issue_reports")
    op.drop_index("ix_issue_reports_status", table_name="issue_reports")
