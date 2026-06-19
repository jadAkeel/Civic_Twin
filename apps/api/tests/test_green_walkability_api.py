from fastapi.testclient import TestClient

from app.main import app
from app.modules.green_score.calculator import calculate_green_score
from app.modules.walkability.calculator import calculate_walkability_score


def test_green_score_formula_uses_required_weights() -> None:
    result = calculate_green_score(
        {
            "air_quality_score": 50,
            "green_coverage_score": 60,
            "waste_cleanliness_score": 70,
            "walkability_score": 80,
            "heat_comfort_score": 90,
        }
    )

    assert result["score"] == 65
    assert result["breakdown"][0]["weight"] == 0.30
    assert result["breakdown"][-1]["factor"] == "heat_comfort_score"


def test_walkability_score_formula_is_explainable() -> None:
    result = calculate_walkability_score(
        {
            "sidewalk_quality": 50,
            "crossing_safety": 60,
            "lighting_quality": 70,
            "accessibility_score": 80,
            "slope_comfort": 90,
            "perceived_safety": 100,
        }
    )

    assert result["score"] == 69.5
    assert {item["factor"] for item in result["breakdown"]} == {
        "sidewalk_quality",
        "crossing_safety",
        "lighting_quality",
        "accessibility_score",
        "slope_comfort",
        "perceived_safety",
    }


def test_green_score_endpoint_returns_tripoli_neighborhood_breakdowns() -> None:
    client = TestClient(app)

    response = client.get("/green-score/neighborhoods")

    assert response.status_code == 200
    rows = response.json()
    assert len(rows) >= 9
    assert rows[0]["green_score"] >= rows[-1]["green_score"]
    assert len(rows[0]["green_breakdown"]) == 5


def test_walkability_endpoint_returns_tripoli_neighborhood_breakdowns() -> None:
    client = TestClient(app)

    response = client.get("/walkability/neighborhoods/old-souks")

    assert response.status_code == 200
    row = response.json()
    assert row["neighborhood"] == "\u0627\u0644\u0623\u0633\u0648\u0627\u0642 \u0627\u0644\u0642\u062f\u064a\u0645\u0629"
    assert row["walkability_score"] > 60
    assert len(row["walkability_breakdown"]) == 6
