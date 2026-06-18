"""Phase 2 city model and PostGIS tables.

Revision ID: 20260616_0001
Revises:
Create Date: 2026-06-16
"""

from collections.abc import Sequence

from alembic import op
import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260616_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('citizen', 'municipality_admin', 'decision_maker', 'analyst')", name="user_role_allowed"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "neighborhoods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("country", sa.String(length=120), nullable=False),
        sa.Column("center_point", geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("boundary", geoalchemy2.Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False), nullable=True),
        sa.Column("population_estimate", sa.Integer(), nullable=True),
        sa.Column("priority_level", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_neighborhoods_slug", "neighborhoods", ["slug"])
    op.create_index("ix_neighborhoods_center_point", "neighborhoods", ["center_point"], postgresql_using="gist")
    op.create_index("ix_neighborhoods_boundary", "neighborhoods", ["boundary"], postgresql_using="gist")

    op.create_table(
        "city_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("asset_type", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), sa.ForeignKey("neighborhoods.id"), nullable=True),
        sa.Column("location", geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True),
        sa.Column("geometry", geoalchemy2.Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=False), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "asset_type IN ('road', 'sidewalk', 'street_light', 'waste_container', 'park', 'tree', 'bus_stop', 'school', 'hospital', 'municipal_facility', 'heritage_site', 'sensor')",
            name="city_asset_type_allowed",
        ),
        sa.CheckConstraint("status IN ('active', 'needs_maintenance', 'inactive', 'planned')", name="city_asset_status_allowed"),
    )
    op.create_index("ix_city_assets_neighborhood_id", "city_assets", ["neighborhood_id"])
    op.create_index("ix_city_assets_location", "city_assets", ["location"], postgresql_using="gist")
    op.create_index("ix_city_assets_geometry", "city_assets", ["geometry"], postgresql_using="gist")

    op.create_table(
        "issue_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("location", geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("ai_detected_category", sa.String(length=60), nullable=True),
        sa.Column("ai_confidence", sa.Numeric(5, 4), nullable=True),
        sa.Column("duplicate_group_id", sa.String(length=120), nullable=True),
        sa.Column("neighborhood_id", sa.Integer(), sa.ForeignKey("neighborhoods.id"), nullable=False),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "category IN ('pothole', 'garbage', 'broken_sidewalk', 'street_lighting', 'water_leakage', 'traffic_obstruction', 'accessibility_issue', 'pollution', 'public_safety', 'other')",
            name="issue_report_category_allowed",
        ),
        sa.CheckConstraint("severity IN ('low', 'medium', 'high', 'critical')", name="issue_report_severity_allowed"),
        sa.CheckConstraint("status IN ('submitted', 'validated', 'in_progress', 'resolved', 'rejected', 'duplicate')", name="issue_report_status_allowed"),
        sa.CheckConstraint("source IN ('citizen', 'municipality', 'sensor', 'demo_seed')", name="issue_report_source_allowed"),
    )
    op.create_index("ix_issue_reports_neighborhood_id", "issue_reports", ["neighborhood_id"])
    op.create_index("ix_issue_reports_created_by_id", "issue_reports", ["created_by_id"])
    op.create_index("ix_issue_reports_duplicate_group_id", "issue_reports", ["duplicate_group_id"])
    op.create_index("ix_issue_reports_location", "issue_reports", ["location"], postgresql_using="gist")

    op.create_table(
        "green_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("neighborhood_id", sa.Integer(), sa.ForeignKey("neighborhoods.id"), nullable=False),
        sa.Column("air_quality_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("green_coverage_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("waste_cleanliness_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("walkability_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("heat_comfort_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("overall_green_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("measurement_date", sa.Date(), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_green_metrics_neighborhood_id", "green_metrics", ["neighborhood_id"])

    op.create_table(
        "walkability_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("neighborhood_id", sa.Integer(), sa.ForeignKey("neighborhoods.id"), nullable=False),
        sa.Column("sidewalk_quality", sa.Numeric(5, 2), nullable=False),
        sa.Column("crossing_safety", sa.Numeric(5, 2), nullable=False),
        sa.Column("lighting_quality", sa.Numeric(5, 2), nullable=False),
        sa.Column("accessibility_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("slope_comfort", sa.Numeric(5, 2), nullable=False),
        sa.Column("perceived_safety", sa.Numeric(5, 2), nullable=False),
        sa.Column("overall_walkability_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("measurement_date", sa.Date(), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_walkability_metrics_neighborhood_id", "walkability_metrics", ["neighborhood_id"])

    op.create_table(
        "mobility_edges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("edge_type", sa.String(length=40), nullable=False),
        sa.Column("from_label", sa.String(length=120), nullable=True),
        sa.Column("to_label", sa.String(length=120), nullable=True),
        sa.Column("geometry", geoalchemy2.Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=False), nullable=False),
        sa.Column("length_meters", sa.Numeric(10, 2), nullable=True),
        sa.Column("estimated_speed_kmh", sa.Numeric(6, 2), nullable=True),
        sa.Column("walkability_weight", sa.Numeric(5, 2), nullable=True),
        sa.Column("pollution_weight", sa.Numeric(5, 2), nullable=True),
        sa.Column("safety_weight", sa.Numeric(5, 2), nullable=True),
        sa.Column("accessibility_weight", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("edge_type IN ('road', 'pedestrian_path', 'bike_lane', 'bus_route', 'informal_route')", name="mobility_edge_type_allowed"),
    )
    op.create_index("ix_mobility_edges_geometry", "mobility_edges", ["geometry"], postgresql_using="gist")

    op.create_table(
        "scenarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), sa.ForeignKey("neighborhoods.id"), nullable=False),
        sa.Column("scenario_type", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "scenario_type IN ('add_trees', 'add_bike_lane', 'add_park', 'add_bus_stop', 'improve_waste_collection', 'pedestrianize_street', 'change_traffic_flow', 'improve_sidewalks', 'improve_lighting')",
            name="scenario_type_allowed",
        ),
        sa.CheckConstraint("status IN ('draft', 'simulated', 'approved', 'rejected', 'archived')", name="scenario_status_allowed"),
    )
    op.create_index("ix_scenarios_neighborhood_id", "scenarios", ["neighborhood_id"])
    op.create_index("ix_scenarios_created_by_id", "scenarios", ["created_by_id"])

    op.create_table(
        "scenario_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id"), nullable=False),
        sa.Column("action_type", sa.String(length=80), nullable=False),
        sa.Column("parameters_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("target_geometry", geoalchemy2.Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_scenario_actions_scenario_id", "scenario_actions", ["scenario_id"])
    op.create_index("ix_scenario_actions_target_geometry", "scenario_actions", ["target_geometry"], postgresql_using="gist")

    op.create_table(
        "scenario_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id"), nullable=False),
        sa.Column("green_score_delta", sa.Numeric(6, 2), nullable=False),
        sa.Column("temperature_delta", sa.Numeric(6, 2), nullable=False),
        sa.Column("air_quality_delta", sa.Numeric(6, 2), nullable=False),
        sa.Column("walkability_delta", sa.Numeric(6, 2), nullable=False),
        sa.Column("traffic_delta", sa.Numeric(6, 2), nullable=False),
        sa.Column("pollution_delta", sa.Numeric(6, 2), nullable=False),
        sa.Column("estimated_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("implementation_time_days", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(length=40), nullable=False),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("scenario_id"),
    )
    op.create_index("ix_scenario_results_scenario_id", "scenario_results", ["scenario_id"])

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("prediction_type", sa.String(length=80), nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), sa.ForeignKey("neighborhoods.id"), nullable=True),
        sa.Column("target_asset_id", sa.Integer(), sa.ForeignKey("city_assets.id"), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("prediction_window_hours", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("evidence_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "prediction_type IN ('congestion_risk', 'waste_accumulation_risk', 'infrastructure_failure_risk', 'heat_risk', 'service_pressure_risk')",
            name="prediction_type_allowed",
        ),
        sa.CheckConstraint("severity IN ('low', 'medium', 'high', 'critical')", name="prediction_severity_allowed"),
    )
    op.create_index("ix_predictions_neighborhood_id", "predictions", ["neighborhood_id"])
    op.create_index("ix_predictions_target_asset_id", "predictions", ["target_asset_id"])

    op.create_table(
        "ai_queries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("data_sources_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_ai_queries_user_id", "ai_queries", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_queries_user_id", table_name="ai_queries")
    op.drop_table("ai_queries")
    op.drop_index("ix_predictions_target_asset_id", table_name="predictions")
    op.drop_index("ix_predictions_neighborhood_id", table_name="predictions")
    op.drop_table("predictions")
    op.drop_index("ix_scenario_results_scenario_id", table_name="scenario_results")
    op.drop_table("scenario_results")
    op.drop_index("ix_scenario_actions_target_geometry", table_name="scenario_actions")
    op.drop_index("ix_scenario_actions_scenario_id", table_name="scenario_actions")
    op.drop_table("scenario_actions")
    op.drop_index("ix_scenarios_created_by_id", table_name="scenarios")
    op.drop_index("ix_scenarios_neighborhood_id", table_name="scenarios")
    op.drop_table("scenarios")
    op.drop_index("ix_mobility_edges_geometry", table_name="mobility_edges")
    op.drop_table("mobility_edges")
    op.drop_index("ix_walkability_metrics_neighborhood_id", table_name="walkability_metrics")
    op.drop_table("walkability_metrics")
    op.drop_index("ix_green_metrics_neighborhood_id", table_name="green_metrics")
    op.drop_table("green_metrics")
    op.drop_index("ix_issue_reports_location", table_name="issue_reports")
    op.drop_index("ix_issue_reports_duplicate_group_id", table_name="issue_reports")
    op.drop_index("ix_issue_reports_created_by_id", table_name="issue_reports")
    op.drop_index("ix_issue_reports_neighborhood_id", table_name="issue_reports")
    op.drop_table("issue_reports")
    op.drop_index("ix_city_assets_geometry", table_name="city_assets")
    op.drop_index("ix_city_assets_location", table_name="city_assets")
    op.drop_index("ix_city_assets_neighborhood_id", table_name="city_assets")
    op.drop_table("city_assets")
    op.drop_index("ix_neighborhoods_boundary", table_name="neighborhoods")
    op.drop_index("ix_neighborhoods_center_point", table_name="neighborhoods")
    op.drop_index("ix_neighborhoods_slug", table_name="neighborhoods")
    op.drop_table("neighborhoods")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
