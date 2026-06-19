"""Add owner and agency roles for CityMind access control.

Revision ID: 20260619_0002
Revises: 20260616_0001
Create Date: 2026-06-19
"""

from alembic import op


revision = "20260619_0002"
down_revision = "20260616_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("user_role_allowed", "users", type_="check")
    op.create_check_constraint(
        "user_role_allowed",
        "users",
        "role IN ('owner', 'citizen', 'municipality_admin', 'decision_maker', 'analyst', 'police', 'red_cross', 'civil_defense')",
    )
    op.drop_constraint("issue_report_category_allowed", "issue_reports", type_="check")
    op.create_check_constraint(
        "issue_report_category_allowed",
        "issue_reports",
        (
            "category IN ('traffic_congestion', 'pothole', 'waste', 'security_incident', "
            "'medical_emergency', 'fire_hazard', 'other', 'garbage', 'broken_sidewalk', "
            "'street_lighting', 'water_leakage', 'traffic_obstruction', 'accessibility_issue', "
            "'pollution', 'public_safety')"
        ),
    )


def downgrade() -> None:
    op.drop_constraint("issue_report_category_allowed", "issue_reports", type_="check")
    op.create_check_constraint(
        "issue_report_category_allowed",
        "issue_reports",
        "category IN ('pothole', 'garbage', 'broken_sidewalk', 'street_lighting', 'water_leakage', 'traffic_obstruction', 'accessibility_issue', 'pollution', 'public_safety', 'other')",
    )
    op.drop_constraint("user_role_allowed", "users", type_="check")
    op.create_check_constraint(
        "user_role_allowed",
        "users",
        "role IN ('citizen', 'municipality_admin', 'decision_maker', 'analyst')",
    )
