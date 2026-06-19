import json
from datetime import date
from pathlib import Path
from typing import Any

from geoalchemy2 import WKTElement
from sqlalchemy.orm import Session

from app.core.seed import seed_path
from app.db.session import SessionLocal
from app.models import (
    AIQuery,
    CityAsset,
    GreenMetric,
    IssueReport,
    MobilityEdge,
    Neighborhood,
    Prediction,
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


def reset_phase2_tables(db: Session) -> None:
    for model in (
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


def load_seed_data(db: Session, data: dict[str, Any]) -> None:
    if not data.get("metadata", {}).get("demo_data"):
        raise ValueError("Tripoli seed data must be explicitly marked as demo_data.")

    reset_phase2_tables(db)

    users_by_email: dict[str, User] = {}
    for item in data.get("users", []):
        user = User(
            full_name=item["full_name"],
            email=item["email"],
            role=item["role"],
            is_active=item.get("is_active", True),
        )
        db.add(user)
        users_by_email[item["email"]] = user

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

    for item in data["issue_reports"]:
        report = IssueReport(
            title=item["title"],
            description=item["description"],
            category=item["category"],
            severity=item["severity"],
            status=item["status"],
            source=item["source"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            location=point_wkt(item["latitude"], item["longitude"]),
            image_url=item.get("image_url"),
            ai_detected_category=item.get("ai_detected_category"),
            ai_confidence=item.get("ai_confidence"),
            duplicate_group_id=item.get("duplicate_group_id"),
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

    for item in data.get("predictions", []):
        db.add(
            Prediction(
                prediction_type=item["prediction_type"],
                neighborhood=neighborhoods_by_slug.get(item.get("neighborhood_slug", "")),
                severity=item["severity"],
                confidence_score=item["confidence_score"],
                prediction_window_hours=item["prediction_window_hours"],
                message=item["message"],
                evidence_json=item.get("evidence_json", {}),
            )
        )

    for item in data.get("ai_queries", []):
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


def main() -> None:
    data = load_seed_file()
    with SessionLocal() as db:
        load_seed_data(db, data)
    print("Loaded CityMind Tripoli Phase 2 demo seed data.")


if __name__ == "__main__":
    main()
