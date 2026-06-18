from pathlib import Path

from geoalchemy2 import Geometry

from app.db.base import Base


def test_phase2_models_include_required_geometry_columns() -> None:
    expected_geometry = {
        ("neighborhoods", "center_point", "POINT"),
        ("neighborhoods", "boundary", "POLYGON"),
        ("issue_reports", "location", "POINT"),
        ("city_assets", "location", "POINT"),
        ("city_assets", "geometry", "GEOMETRY"),
        ("mobility_edges", "geometry", "LINESTRING"),
        ("scenario_actions", "target_geometry", "GEOMETRY"),
    }

    actual_geometry = set()
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, Geometry):
                actual_geometry.add((table.name, column.name, column.type.geometry_type))

    assert expected_geometry.issubset(actual_geometry)
    assert all(item[2] in {"POINT", "POLYGON", "LINESTRING", "GEOMETRY"} for item in actual_geometry)


def test_initial_migration_enables_postgis_and_spatial_indexes() -> None:
    migration_path = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "20260616_0001_phase2_city_model.py"
    migration = migration_path.read_text(encoding="utf-8")

    assert "CREATE EXTENSION IF NOT EXISTS postgis" in migration
    assert 'postgresql_using="gist"' in migration
    assert 'geometry_type="POINT"' in migration
    assert 'geometry_type="LINESTRING"' in migration
    assert "srid=4326" in migration
