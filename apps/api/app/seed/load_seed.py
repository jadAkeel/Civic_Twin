import argparse
import json
import sys
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.core.seed import seed_path
from app.db.session import SessionLocal
from app.modules.reports.router import _canonical_category
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

SEED_PATH = seed_path()


def point_wkt(latitude: float, longitude: float) -> WKTElement:
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def linestring_wkt(coordinates: list[list[float]]) -> WKTElement:
    pairs = ", ".join(f"{longitude} {latitude}" for latitude, longitude in coordinates)
    return WKTElement(f"LINESTRING({pairs})", srid=4326)


def polygon_wkt(coordinates: list[list[float]]) -> WKTElement:
    pairs = ", ".join(f"{longitude} {latitude}" for latitude, longitude in coordinates)
    return WKTElement(f"POLYGON(({pairs}))", srid=4326)


def load_seed_file(path: Path = SEED_PATH) -> dict[str, Any]:
    with path.open(encoding="utf-8") as seed_file:
        return json.load(seed_file)


def _bootstrap_owner(db: Session) -> User | None:
    """Create the single real owner account from environment secrets, if configured."""
    email = (settings.bootstrap_owner_email or "").strip().lower()
    password = settings.bootstrap_owner_password
    if not email or password is None:
        return None
    owner = User(
        full_name="CityMind Owner",
        email=email,
        password_hash=hash_password(password.get_secret_value()),
        role="owner",
        is_active=True,
        email_verified_at=datetime.now(UTC),
    )
    db.add(owner)
    return owner


def reset_phase2_tables(db: Session) -> None:
    for model in (
        AuditEvent,
        RateLimitBucket,
        AIQuery,
        Prediction,
        ScenarioResult,
        ScenarioAction,
        Scenario,
        MobilityEdge,
        WalkabilityMetric,
        GreenMetric,
        IssueReport,
        CityAsset,
        Neighborhood,
        User,
    ):
        db.query(model).delete()


def load_seed_data(
    db: Session,
    data: dict[str, Any],
    *,
    include_demo_users: bool | None = None,
    include_demo_records: bool | None = None,
) -> None:
    """Load the reference baseline.

    Reference data (neighbourhoods, metrics, assets, the walking network and scenario
    templates) is always loaded. Demo *records* (fictional citizen reports, stored
    predictions and assistant history) are skipped in production so residents and
    staff never see invented reports mixed in with real ones.
    """
    if not data.get("metadata", {}).get("demo_data"):
        raise ValueError("Tripoli seed data must be explicitly marked as demo_data.")

    if include_demo_users is None:
        include_demo_users = settings.allow_demo_users
    if include_demo_records is None:
        include_demo_records = not settings.is_production
    if include_demo_users and settings.is_production:
        raise ValueError(
            "Demo accounts use publicly documented passwords and must never be created in production. "
            "Set ALLOW_DEMO_USERS=false and provision an owner with BOOTSTRAP_OWNER_EMAIL/PASSWORD."
        )

    reset_phase2_tables(db)

    users_by_email: dict[str, User] = {}
    if include_demo_users:
        for item in data.get("users", []):
            user = User(
                full_name=item["full_name"],
                email=item["email"],
                password_hash=item.get("password_hash"),
                role=item["role"],
                is_active=item.get("is_active", True),
                email_verified_at=datetime.now(UTC),
            )
            db.add(user)
            users_by_email[item["email"]] = user

    bootstrap = _bootstrap_owner(db)
    if bootstrap is not None:
        users_by_email[bootstrap.email] = bootstrap

    neighborhoods_by_slug: dict[str, Neighborhood] = {}
    for item in data["neighborhoods"]:
        neighborhood = Neighborhood(
            name=item["name"],
            slug=item["slug"],
            description=item["description"],
            city=item.get("city", "Tripoli"),
            country=item.get("country", "Lebanon"),
            center_point=point_wkt(item["center_point"]["latitude"], item["center_point"]["longitude"]),
            boundary=polygon_wkt(item["boundary"]) if item.get("boundary") else None,
            population_estimate=item.get("population_estimate"),
            priority_level=item["priority_level"],
        )
        db.add(neighborhood)
        neighborhoods_by_slug[item["slug"]] = neighborhood

    db.flush()

    for item in data["city_assets"]:
        asset = CityAsset(
            name=item["name"],
            asset_type=item["asset_type"],
            status=item["status"],
            neighborhood=neighborhoods_by_slug.get(item.get("neighborhood_slug", "")),
            location=point_wkt(item["location"]["latitude"], item["location"]["longitude"]) if item.get("location") else None,
            geometry=linestring_wkt(item["geometry"]["coordinates"])
            if item.get("geometry", {}).get("type") == "LineString"
            else None,
            metadata_json=item.get("metadata_json", {}),
        )
        db.add(asset)

    for item in data["issue_reports"] if include_demo_records else []:
        report = IssueReport(
            title=item["title"],
            description=item["description"],
            # Stored under the current category names so SQL filters, agency scoping
            # and aggregates agree with what the API returns.
            category=_canonical_category(item["category"]),
            severity=item["severity"],
            status=item["status"],
            source=item["source"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            location=point_wkt(item["latitude"], item["longitude"]),
            location_source="demo_seed",
            image_url=item.get("image_url"),
            image_upload_status="none",
            image_metadata={},
            analysis_status="not_configured",
            image_analysis={},
            ai_detected_category=item.get("ai_detected_category"),
            ai_confidence=item.get("ai_confidence"),
            duplicate_group_id=item.get("duplicate_group_id"),
            duplicate_candidates=[],
            neighborhood=neighborhoods_by_slug[item["neighborhood_slug"]],
            created_by=users_by_email.get(item.get("created_by_email", "")),
        )
        db.add(report)

    for item in data["green_metrics"]:
        metric = GreenMetric(
            neighborhood=neighborhoods_by_slug[item["neighborhood_slug"]],
            air_quality_score=item["air_quality_score"],
            green_coverage_score=item["green_coverage_score"],
            waste_cleanliness_score=item["waste_cleanliness_score"],
            walkability_score=item["walkability_score"],
            heat_comfort_score=item["heat_comfort_score"],
            overall_green_score=item["overall_green_score"],
            measurement_date=date.fromisoformat(item["measurement_date"]),
            source=item["source"],
        )
        db.add(metric)

    for item in data["walkability_metrics"]:
        metric = WalkabilityMetric(
            neighborhood=neighborhoods_by_slug[item["neighborhood_slug"]],
            sidewalk_quality=item["sidewalk_quality"],
            crossing_safety=item["crossing_safety"],
            lighting_quality=item["lighting_quality"],
            accessibility_score=item["accessibility_score"],
            slope_comfort=item["slope_comfort"],
            perceived_safety=item["perceived_safety"],
            overall_walkability_score=item["overall_walkability_score"],
            measurement_date=date.fromisoformat(item["measurement_date"]),
            source=item["source"],
        )
        db.add(metric)

    for item in data["mobility_edges"]:
        edge = MobilityEdge(
            name=item["name"],
            edge_type=item["edge_type"],
            from_label=item.get("from_label"),
            to_label=item.get("to_label"),
            geometry=linestring_wkt(item["coordinates"]),
            length_meters=item.get("length_meters"),
            estimated_speed_kmh=item.get("estimated_speed_kmh"),
            walkability_weight=item.get("walkability_weight"),
            pollution_weight=item.get("pollution_weight"),
            safety_weight=item.get("safety_weight"),
            accessibility_weight=item.get("accessibility_weight"),
        )
        db.add(edge)

    for item in data["scenarios"]:
        scenario = Scenario(
            name=item["name"],
            description=item["description"],
            neighborhood=neighborhoods_by_slug[item["neighborhood_slug"]],
            scenario_type=item["scenario_type"],
            status=item["status"],
            created_by=users_by_email.get(item.get("created_by_email", "")),
        )
        db.add(scenario)
        for action in item.get("actions", []):
            db.add(
                ScenarioAction(
                    scenario=scenario,
                    action_type=action["action_type"],
                    parameters_json=action.get("parameters_json", {}),
                    target_geometry=point_wkt(action["target_point"]["latitude"], action["target_point"]["longitude"])
                    if action.get("target_point")
                    else None,
                )
            )

    db.flush()

    for item in data.get("predictions", []) if include_demo_records else []:
        db.add(
            Prediction(
                prediction_type=item["prediction_type"],
                neighborhood=neighborhoods_by_slug.get(item.get("neighborhood_slug", "")),
                severity=item["severity"],
                confidence_score=item["confidence_score"],
                provider=item.get("provider", "local_grounded_rag"),
                prediction_window_hours=item["prediction_window_hours"],
                message=item["message"],
                evidence_json=item.get("evidence_json", {}),
            )
        )

    for item in data.get("ai_queries", []) if include_demo_records else []:
        db.add(
            AIQuery(
                user=users_by_email.get(item.get("user_email", "")),
                question=item["question"],
                answer=item["answer"],
                data_sources_json=item.get("data_sources_json", {}),
                confidence_score=item["confidence_score"],
            )
        )

    db.commit()


def database_has_operational_data(db: Session) -> bool:
    return bool(
        db.scalar(select(func.count()).select_from(User))
        or db.scalar(select(func.count()).select_from(Neighborhood))
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Load the explicitly labelled CityMind demo baseline")
    parser.add_argument(
        "--if-empty",
        action="store_true",
        help="Load only when the database has no users or neighborhoods; never replace operational data",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Required to wipe and reload a database that already holds operational data",
    )
    args = parser.parse_args()
    if args.force and settings.is_production:
        print(
            "Refusing --force in production: it deletes every citizen report, account and audit event. "
            "Restore from a backup instead.",
            file=sys.stderr,
        )
        raise SystemExit(2)
    data = load_seed_file()
    with SessionLocal() as db:
        already_populated = database_has_operational_data(db)
        if already_populated and args.if_empty:
            print("CityMind database already contains operational data; demo seed was not loaded.")
            return
        if already_populated and not args.force:
            print(
                "Refusing to run: this database already contains operational data and loading the "
                "baseline deletes every table it manages. Re-run with --if-empty (safe bootstrap) "
                "or --force (destructive reload).",
                file=sys.stderr,
            )
            raise SystemExit(2)
        load_seed_data(db, data)

    if settings.allow_demo_users:
        print(
            "WARNING: demo accounts with publicly documented passwords were created. "
            "Never enable ALLOW_DEMO_USERS outside local development.",
            file=sys.stderr,
        )
    if not settings.allow_demo_users and not settings.bootstrap_owner_email:
        print(
            "WARNING: no accounts were created. Set BOOTSTRAP_OWNER_EMAIL and "
            "BOOTSTRAP_OWNER_PASSWORD so an owner can sign in.",
            file=sys.stderr,
        )
    print("Loaded the CityMind Tripoli reference baseline.")


if __name__ == "__main__":
    main()
