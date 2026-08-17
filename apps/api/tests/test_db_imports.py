from app.db.base import Base
from app.models import (
    AIQuery,
    AuditEvent,
    CityAsset,
    GreenMetric,
    IssueReport,
    MobilityEdge,
    Neighborhood,
    Prediction,
    RateLimitBucket,
    Scenario,
    ScenarioAction,
    ScenarioResult,
    User,
    WalkabilityMetric,
)


def test_phase2_models_are_registered_with_sqlalchemy_metadata() -> None:
    expected_tables = {
        "ai_queries",
        "audit_events",
        "city_assets",
        "green_metrics",
        "issue_reports",
        "mobility_edges",
        "neighborhoods",
        "predictions",
        "rate_limit_buckets",
        "scenario_actions",
        "scenario_results",
        "scenarios",
        "users",
        "walkability_metrics",
    }

    assert expected_tables.issubset(Base.metadata.tables.keys())


def test_model_classes_expose_expected_table_names() -> None:
    assert User.__tablename__ == "users"
    assert Neighborhood.__tablename__ == "neighborhoods"
    assert IssueReport.__tablename__ == "issue_reports"
    assert CityAsset.__tablename__ == "city_assets"
    assert GreenMetric.__tablename__ == "green_metrics"
    assert WalkabilityMetric.__tablename__ == "walkability_metrics"
    assert MobilityEdge.__tablename__ == "mobility_edges"
    assert Scenario.__tablename__ == "scenarios"
    assert ScenarioAction.__tablename__ == "scenario_actions"
    assert ScenarioResult.__tablename__ == "scenario_results"
    assert Prediction.__tablename__ == "predictions"
    assert AIQuery.__tablename__ == "ai_queries"
    assert AuditEvent.__tablename__ == "audit_events"
    assert RateLimitBucket.__tablename__ == "rate_limit_buckets"
