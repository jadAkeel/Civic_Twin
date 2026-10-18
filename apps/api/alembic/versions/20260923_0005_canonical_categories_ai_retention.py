"""Store report categories under their current names; index AI history for retention.

Older baselines stored legacy category names (garbage, public_safety, ...). The API
mapped them only on output, so SQL filters, agency scoping (police never saw
public_safety rows), duplicate detection and aggregates silently disagreed with
what the API returned. The names are rewritten in place; the check constraint keeps
accepting the legacy values so this migration is safe to roll back.

Revision ID: 20260923_0005
Revises: 20260922_0004
Create Date: 2026-09-23
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260923_0005"
down_revision: str | None = "20260922_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LEGACY_CATEGORY_MAP = {
    "garbage": "waste",
    "traffic_obstruction": "traffic_congestion",
    "public_safety": "security_incident",
    "broken_sidewalk": "pothole",
    "street_lighting": "other",
    "water_leakage": "other",
    "accessibility_issue": "other",
    "pollution": "other",
}


def upgrade() -> None:
    issue_reports = sa.table("issue_reports", sa.column("category", sa.String))
    for legacy, current in LEGACY_CATEGORY_MAP.items():
        op.execute(issue_reports.update().where(issue_reports.c.category == legacy).values(category=current))
    # AI_QUERY_RETENTION_DAYS purges by age.
    op.create_index("ix_ai_queries_created_at", "ai_queries", ["created_at"])


def downgrade() -> None:
    # The original legacy names cannot be recovered (several mapped to "other").
    op.drop_index("ix_ai_queries_created_at", table_name="ai_queries")
