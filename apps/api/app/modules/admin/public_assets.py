"""Read-only public view of city infrastructure for the resident map.

Only name, type, status, area and position are exposed; internal metadata stays on
the municipality-only /admin/assets endpoint. Every coordinate is GeoJSON order
([longitude, latitude]) regardless of the persistence backend.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.db.session import get_db
from app.models.city_asset import CityAsset

router = APIRouter(prefix="/assets", tags=["assets"])


def _midpoint(line: list[list[float]]) -> tuple[float, float] | None:
    if not line:
        return None
    longitude = sum(point[0] for point in line) / len(line)
    latitude = sum(point[1] for point in line) / len(line)
    return longitude, latitude


def _public_asset(
    *,
    asset_id: str,
    name: str,
    asset_type: str,
    status: str,
    neighborhood_slug: str | None,
    point: tuple[float, float] | None,
    line: list[list[float]],
) -> dict[str, Any] | None:
    position = point or _midpoint(line)
    if position is None:
        return None
    longitude, latitude = position
    return {
        "id": asset_id,
        "name": name,
        "asset_type": asset_type,
        "status": status,
        "neighborhood_slug": neighborhood_slug,
        "longitude": round(float(longitude), 6),
        "latitude": round(float(latitude), 6),
        "line": line,
        "coordinate_order": "longitude_latitude",
    }


def list_public_assets(db: Session) -> list[dict[str, Any]]:
    if settings.operational_persistence_backend == "database":
        rows = db.execute(
            select(
                CityAsset,
                func.ST_X(CityAsset.location),
                func.ST_Y(CityAsset.location),
                func.ST_AsGeoJSON(CityAsset.geometry),
            )
            .options(joinedload(CityAsset.neighborhood))
            .order_by(CityAsset.id)
        ).all()
        assets = []
        for asset, longitude, latitude, geometry_json in rows:
            geometry = json.loads(geometry_json) if geometry_json else {}
            line = geometry.get("coordinates", []) if geometry.get("type") == "LineString" else []
            assets.append(
                _public_asset(
                    asset_id=f"asset-{asset.id}",
                    name=asset.name,
                    asset_type=asset.asset_type,
                    status=asset.status,
                    neighborhood_slug=asset.neighborhood.slug if asset.neighborhood else None,
                    point=(longitude, latitude) if longitude is not None and latitude is not None else None,
                    line=line,
                )
            )
        return [asset for asset in assets if asset is not None]

    # Imported lazily: the admin router owns the in-memory asset store.
    from app.modules.admin.router import _list_assets

    assets = []
    for asset in _list_assets(db):
        location = asset.get("location") or {}
        geometry = asset.get("geometry") or {}
        # The bundled seed stores [latitude, longitude]; convert to GeoJSON order.
        line = (
            [[float(longitude), float(latitude)] for latitude, longitude in geometry.get("coordinates", [])]
            if geometry.get("type") == "LineString"
            else []
        )
        point = (
            (float(location["longitude"]), float(location["latitude"]))
            if location.get("latitude") is not None and location.get("longitude") is not None
            else None
        )
        assets.append(
            _public_asset(
                asset_id=str(asset["id"]),
                name=str(asset["name"]),
                asset_type=str(asset["asset_type"]),
                status=str(asset["status"]),
                neighborhood_slug=asset.get("neighborhood_slug"),
                point=point,
                line=line,
            )
        )
    return [asset for asset in assets if asset is not None]


@router.get("/public")
def public_assets(request: Request, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    enforce_rate_limit(
        request,
        db,
        scope="assets.public",
        limit=settings.public_read_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    return list_public_assets(db)
