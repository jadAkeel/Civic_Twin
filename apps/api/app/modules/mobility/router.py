from __future__ import annotations

import heapq
import json
from itertools import count
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.seed import load_seed
from app.db.session import get_db
from app.models.mobility_edge import MobilityEdge

router = APIRouter(prefix="/mobility", tags=["mobility"])

RouteType = Literal["fastest", "greenest", "safest", "most_walkable", "accessible"]
ROUTE_TYPES: tuple[RouteType, ...] = ("fastest", "greenest", "safest", "most_walkable", "accessible")


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
                "length_meters": float(edge.length_meters or 0),
                "estimated_speed_kmh": float(edge.estimated_speed_kmh or 0),
                "walkability_weight": float(edge.walkability_weight or 0),
                "pollution_weight": float(edge.pollution_weight or 0),
                "safety_weight": float(edge.safety_weight or 0),
                "accessibility_weight": float(edge.accessibility_weight or 0),
            }
            for edge, geometry_json in rows
        ]
    seed = load_seed()
    return [
        {
            "id": f"edge-{index}",
            **edge,
        }
        for index, edge in enumerate(seed["mobility_edges"], start=1)
    ]


def _edge_minutes(edge: dict[str, Any]) -> float:
    speed = max(float(edge.get("estimated_speed_kmh") or 5), 1)
    length_km = float(edge.get("length_meters") or 0) / 1000
    return round((length_km / speed) * 60, 1)


def _route_cost(edge: dict[str, Any], route_type: RouteType) -> float:
    length = float(edge.get("length_meters") or 0)
    if route_type == "fastest":
        return _edge_minutes(edge)
    if route_type == "greenest":
        return length * float(edge.get("pollution_weight") or 0.7)
    if route_type == "safest":
        return length * (1.1 - float(edge.get("safety_weight") or 0.5))
    if route_type == "most_walkable":
        return length * (1.1 - float(edge.get("walkability_weight") or 0.5))
    return length * (1.1 - float(edge.get("accessibility_weight") or 0.5))


def _build_graph(edges: list[dict[str, Any]]) -> dict[str, list[tuple[str, dict[str, Any]]]]:
    graph: dict[str, list[tuple[str, dict[str, Any]]]] = {}
    for edge in edges:
        start = str(edge["from_label"])
        end = str(edge["to_label"])
        graph.setdefault(start, []).append((end, edge))
        graph.setdefault(end, []).append((start, edge))
    return graph


def calculate_route(edges: list[dict[str, Any]], origin: str, destination: str, route_type: RouteType) -> dict[str, Any]:
    graph = _build_graph(edges)
    if origin not in graph or destination not in graph:
        raise HTTPException(status_code=404, detail="Origin or destination is not in the Tripoli mobility seed graph")

    counter = count()
    queue: list[tuple[float, int, str, list[dict[str, Any]]]] = [(0, next(counter), origin, [])]
    best_cost: dict[str, float] = {origin: 0}

    while queue:
        cost, _, node, path = heapq.heappop(queue)
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
                "provider_interface": (
                    "postgis_graph" if settings.operational_persistence_backend == "database" else "demo_seed_graph"
                ),
                "official_navigation_ready": False,
            }

        for next_node, edge in graph.get(node, []):
            next_cost = cost + _route_cost(edge, route_type)
            if next_cost < best_cost.get(next_node, float("inf")):
                best_cost[next_node] = next_cost
                heapq.heappush(queue, (next_cost, next(counter), next_node, [*path, edge]))

    raise HTTPException(status_code=404, detail="No mock route is available between these Tripoli points")


@router.get("/edges")
def list_edges(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return _load_edges(db)


@router.get("/routes")
def compare_routes(
    origin: str = Query(default="Al Mina", min_length=2),
    destination: str = Query(default="Old Souks", min_length=2),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    edges = _load_edges(db)
    return {
        "origin": origin,
        "destination": destination,
        "route_types": ROUTE_TYPES,
        "options": [calculate_route(edges, origin, destination, route_type) for route_type in ROUTE_TYPES],
        "future_providers": ["OpenTripPlanner", "GraphHopper", "Valhalla"],
    }
