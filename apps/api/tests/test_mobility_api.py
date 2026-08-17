from fastapi.testclient import TestClient

from app.main import app
from app.modules.mobility.router import ROUTE_TYPES, _load_edges, calculate_route


def test_calculate_route_uses_seed_graph_for_fastest_route() -> None:
    route = calculate_route(_load_edges(), "Al Mina", "Old Souks", "fastest")

    assert route["route_type"] == "fastest"
    assert route["origin"] == "Al Mina"
    assert route["destination"] == "Old Souks"
    assert route["distance_meters"] > 0
    assert len(route["segments"]) == 2
    assert route["provider_interface"] == "demo_seed_graph"
    assert route["official_navigation_ready"] is False


def test_route_comparison_returns_all_supported_modes() -> None:
    client = TestClient(app)

    response = client.get("/mobility/routes", params={"origin": "Al Mina", "destination": "Old Souks"})

    assert response.status_code == 200
    payload = response.json()
    assert tuple(payload["route_types"]) == ROUTE_TYPES
    assert {option["route_type"] for option in payload["options"]} == set(ROUTE_TYPES)
    assert "GraphHopper" in payload["future_providers"]


def test_unknown_route_point_returns_not_found() -> None:
    client = TestClient(app)

    response = client.get("/mobility/routes", params={"origin": "Unknown", "destination": "Old Souks"})

    assert response.status_code == 404
