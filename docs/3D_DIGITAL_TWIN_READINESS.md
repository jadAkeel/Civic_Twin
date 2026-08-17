# CityMind Tripoli 3D Digital Twin Readiness

Phase 16 prepares a future Cesium boundary without requiring a Cesium token, paid terrain, or 3D service.

## Layer Contracts

- Buildings: CityGML or 3D Tiles source for Tripoli building massing.
- Terrain: 3D Tiles terrain/coastline context.
- Mobility: CityMind mobility-edge overlays.
- Assets: CityMind city asset overlays.
- Risk: City Guardian prediction overlays.

## Future Storage Path

- CityGML import for municipal or validated open data.
- 3DCityDB for structured 3D city objects.
- 3D Tiles export for web streaming.
- Cesium viewer integration only after token/config handling is explicit.

## Current Constraint

No Cesium dependency, token, or paid service is required for the current app. The `/digital-twin` page is a readiness surface only.
