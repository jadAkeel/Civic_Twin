from app.models.enums import REPORT_CATEGORIES, REPORT_SEVERITIES, REPORT_STATUSES, SCENARIO_TYPES
from app.seed.load_seed import load_seed_file


def test_tripoli_seed_data_is_demo_labeled_and_city_specific() -> None:
    data = load_seed_file()

    assert data["metadata"]["project"] == "CityMind Tripoli"
    assert data["metadata"]["city"] == "Tripoli"
    assert data["metadata"]["country"] == "Lebanon"
    assert data["metadata"]["demo_data"] is True
    assert "not official municipal GIS data" in data["metadata"]["data_notice"]


def test_tripoli_seed_data_contains_required_neighborhoods() -> None:
    data = load_seed_file()
    slugs = {neighborhood["slug"] for neighborhood in data["neighborhoods"]}

    assert {
        "al-mina",
        "el-tal",
        "bab-al-tebbaneh",
        "jabal-mohsen",
        "qoubbeh",
        "abu-samra",
        "old-souks",
        "port-area",
    }.issubset(slugs)
    assert "al-zahriyeh" in slugs


def test_seed_reports_are_sufficient_and_use_allowed_taxonomy() -> None:
    data = load_seed_file()

    assert len(data["issue_reports"]) >= 20
    for report in data["issue_reports"]:
        assert report["source"] == "demo_seed"
        assert report["category"] in REPORT_CATEGORIES
        assert report["severity"] in REPORT_SEVERITIES
        assert report["status"] in REPORT_STATUSES
        assert 34.3 < report["latitude"] < 34.6
        assert 35.7 < report["longitude"] < 36.0


def test_seed_metrics_cover_every_neighborhood() -> None:
    data = load_seed_file()
    neighborhood_slugs = {neighborhood["slug"] for neighborhood in data["neighborhoods"]}

    assert {metric["neighborhood_slug"] for metric in data["green_metrics"]} == neighborhood_slugs
    assert {metric["neighborhood_slug"] for metric in data["walkability_metrics"]} == neighborhood_slugs


def test_seed_scenarios_match_phase2_scope() -> None:
    data = load_seed_file()

    assert len(data["scenarios"]) >= 5
    assert {scenario["scenario_type"] for scenario in data["scenarios"]}.issubset(SCENARIO_TYPES)
    assert all(scenario["status"] == "draft" for scenario in data["scenarios"])
