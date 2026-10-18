from __future__ import annotations

import heapq
import json
from itertools import count
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.core.seed import load_seed
from app.db.session import get_db
from app.models.mobility_edge import MobilityEdge

router = APIRouter(prefix="/mobility", tags=["mobility"])

RouteType = Literal["fastest", "greenest", "safest", "most_walkable", "accessible"]
ROUTE_TYPES: tuple[RouteType, ...] = ("fastest", "greenest", "safest", "most_walkable", "accessible")

# Every coordinate this module emits is GeoJSON order: [longitude, latitude].
# The bundled seed stores [latitude, longitude], so it is converted on read; PostGIS
# already returns GeoJSON order. Without this the same endpoint returned two
# different orders depending on the persistence backend.
COORDINATE_ORDER = "longitude_latitude"
MAX_ROUTE_NODES = 5_000


def _seed_coordinates(coordinates: list[list[float]]) -> list[list[float]]:
    return [[float(longitude), float(latitude)] for latitude, longitude in coordinates]


def _optional_float(value: Any) -> float | None:
    """Keep "missing" distinct from a real 0 so a genuine 0 weight is not replaced."""
    return None if value is None else float(value)


def _load_edges(db: Session | None = None) -> list[dict[str, Any]]:
    if settings.operational_persistence_backend == "database":
        if db is None:
            raise RuntimeError("A database session is required for mobility persistence")
        rows = db.execute(
            select(MobilityEdge, func.ST_AsGeoJSON(MobilityEdge.geometry)).order_by(MobilityEdge.id)
        ).all()
        return [
            {
                "id": f"edge-{edge.id}",
                "name": edge.name,
                "edge_type": edge.edge_type,
                "from_label": edge.from_label,
                "to_label": edge.to_label,
                "coordinates": json.loads(geometry_json)["coordinates"] if geometry_json else [],
                "coordinate_order": COORDINATE_ORDER,
                "length_meters": float(edge.length_meters or 0),
                "estimated_speed_kmh": _optional_float(edge.estimated_speed_kmh),
                "walkability_weight": _optional_float(edge.walkability_weight),
                "pollution_weight": _optional_float(edge.pollution_weight),
                "safety_weight": _optional_float(edge.safety_weight),
                "accessibility_weight": _optional_float(edge.accessibility_weight),
            }
            for edge, geometry_json in rows
        ]
    seed = load_seed()
    return [
        {
            **edge,
            "id": f"edge-{index}",
            "coordinates": _seed_coordinates(edge.get("coordinates", [])),
            "coordinate_order": COORDINATE_ORDER,
        }
        for index, edge in enumerate(seed["mobility_edges"], start=1)
    ]


def _edge_minutes(edge: dict[str, Any]) -> float:
    speed = max(float(edge.get("estimated_speed_kmh") or 5), 1)
    length_km = float(edge.get("length_meters") or 0) / 1000
    return round((length_km / speed) * 60, 1)


def _weight(edge: dict[str, Any], key: str, default: float) -> float:
    """A 0..1 edge weight; missing uses the default, out-of-range data is clamped.

    Unclamped, a weight above 1.1 made the cost negative and broke shortest-path
    search (Dijkstra requires non-negative edge costs).
    """
    value = edge.get(key)
    if value is None:
        return default
    return min(1.0, max(0.0, float(value)))


def _route_cost(edge: dict[str, Any], route_type: RouteType) -> float:
    length = max(0.0, float(edge.get("length_meters") or 0))
    if route_type == "fastest":
        return _edge_minutes(edge)
    if route_type == "greenest":
        return length * _weight(edge, "pollution_weight", 0.7)
    if route_type == "safest":
        return length * (1.1 - _weight(edge, "safety_weight", 0.5))
    if route_type == "most_walkable":
        return length * (1.1 - _weight(edge, "walkability_weight", 0.5))
    return length * (1.1 - _weight(edge, "accessibility_weight", 0.5))


def _build_graph(edges: list[dict[str, Any]]) -> dict[str, list[tuple[str, dict[str, Any]]]]:
    graph: dict[str, list[tuple[str, dict[str, Any]]]] = {}
    for edge in edges:
        start, end = edge.get("from_label"), edge.get("to_label")
        # An unlabelled edge would otherwise join a phantom "None" node and connect
        # unrelated places into fake routes.
        if not start or not end:
            continue
        forward = {**edge, "traversed_reversed": False}
        backward = {
            **edge,
            "coordinates": list(reversed(edge.get("coordinates") or [])),
            "traversed_reversed": True,
        }
        graph.setdefault(str(start), []).append((str(end), forward))
        graph.setdefault(str(end), []).append((str(start), backward))
    return graph


def calculate_route(edges: list[dict[str, Any]], origin: str, destination: str, route_type: RouteType) -> dict[str, Any]:
    graph = _build_graph(edges)
    if origin not in graph or destination not in graph:
        raise HTTPException(status_code=404, detail="Origin or destination is not in the CityMind mobility graph")

    counter = count()
    queue: list[tuple[float, int, str, list[dict[str, Any]]]] = [(0, next(counter), origin, [])]
    best_cost: dict[str, float] = {origin: 0}
    visited: set[str] = set()

    while queue:
        cost, _, node, path = heapq.heappop(queue)
        if node in visited:
            continue
        visited.add(node)
        if len(visited) > MAX_ROUTE_NODES:
            raise HTTPException(status_code=503, detail="The mobility graph is too large to search")
        if node == destination:
            distance = sum(float(edge.get("length_meters") or 0) for edge in path)
            minutes = sum(_edge_minutes(edge) for edge in path)
            return {
                "route_type": route_type,
                "origin": origin,
                "destination": destination,
                "distance_meters": round(distance),
                "estimated_minutes": round(minutes, 1),
                "score": round(cost, 2),
                "segments": path,
                "coordinate_order": COORDINATE_ORDER,
                "provider_interface": (
                    "postgis_graph" if settings.operational_persistence_backend == "database" else "demo_seed_graph"
                ),
                "official_navigation_ready": False,
            }

        for next_node, edge in graph.get(node, []):
            if next_node in visited:
                continue
            next_cost = cost + _route_cost(edge, route_type)
            if next_cost < best_cost.get(next_node, float("inf")):
                best_cost[next_node] = next_cost
                heapq.heappush(queue, (next_cost, next(counter), next_node, [*path, edge]))

    raise HTTPException(status_code=404, detail="No route is available between these Tripoli points")


def _known_points(edges: list[dict[str, Any]]) -> list[str]:
    return sorted({str(edge[key]) for edge in edges for key in ("from_label", "to_label") if edge.get(key)})


@router.get("/edges")
def list_edges(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="mobility.edges",
        limit=settings.public_read_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    edges = _load_edges(db)
    return {"coordinate_order": COORDINATE_ORDER, "edges": edges, "points": _known_points(edges)}


@router.get("/points")
def list_points(request: Request, db: Session = Depends(get_db)) -> list[str]:
    enforce_rate_limit(
        request,
        db,
        scope="mobility.points",
        limit=settings.public_read_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    return _known_points(_load_edges(db))


@router.get("/routes")
def compare_routes(
    request: Request,
    origin: str = Query(default="Al Mina", min_length=2, max_length=120),
    destination: str = Query(default="Old Souks", min_length=2, max_length=120),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="mobility.routes",
        limit=settings.public_read_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    edges = _load_edges(db)
    if origin == destination:
        raise HTTPException(status_code=422, detail="Choose two different points")
    return {
        "origin": origin,
        "destination": destination,
        "route_types": ROUTE_TYPES,
        "coordinate_order": COORDINATE_ORDER,
        "options": [calculate_route(edges, origin, destination, route_type) for route_type in ROUTE_TYPES],
        "available_points": _known_points(edges),
        "future_providers": ["OpenTripPlanner", "GraphHopper", "Valhalla"],
    }
