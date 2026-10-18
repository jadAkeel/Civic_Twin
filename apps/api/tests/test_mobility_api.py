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


def test_route_segments_always_use_geojson_coordinate_order() -> None:
    route = calculate_route(_load_edges(), "Al Mina", "Old Souks", "fastest")

    assert route["coordinate_order"] == "longitude_latitude"
    for segment in route["segments"]:
        for longitude, latitude in segment["coordinates"]:
            # Tripoli sits near 34.4 N, 35.8 E: longitude is always the larger value.
            assert 35.0 < longitude < 36.5, segment["coordinates"]
            assert 34.0 < latitude < 35.0, segment["coordinates"]


def test_edges_endpoint_exposes_points_and_coordinate_order() -> None:
    client = TestClient(app)

    response = client.get("/mobility/edges")

    assert response.status_code == 200
    payload = response.json()
    assert payload["coordinate_order"] == "longitude_latitude"
    assert "Al Mina" in payload["points"]
    assert payload["edges"]


def test_identical_origin_and_destination_are_rejected() -> None:
    client = TestClient(app)

    response = client.get("/mobility/routes", params={"origin": "Al Mina", "destination": "Al Mina"})

    assert response.status_code == 422


def test_public_assets_expose_positions_in_geojson_order_without_metadata() -> None:
    client = TestClient(app)

    response = client.get("/assets/public")

    assert response.status_code == 200
    assets = response.json()
    assert assets
    for asset in assets:
        assert "metadata_json" not in asset
        assert asset["coordinate_order"] == "longitude_latitude"
        assert 35.0 < asset["longitude"] < 36.5 and 34.0 < asset["latitude"] < 35.0
        for longitude, latitude in asset["line"]:
            assert 35.0 < longitude < 36.5 and 34.0 < latitude < 35.0
