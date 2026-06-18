# CityMind Tripoli Roadmap

## Next Engineering Steps

- Persist report, scenario, prediction, assistant, and admin mutations in PostgreSQL.
- Add frontend component or Playwright tests for critical workflows.
- Replace local auth placeholders with production identity and RBAC.
- Add event contracts before extracting microservices.
- Validate Tripoli GIS and operational data with municipal or trusted local sources.

## Future Integrations

- Routing: OpenTripPlanner, GraphHopper, or Valhalla.
- Simulation: SUMO and MATSim adapters.
- 3D: CityGML, 3DCityDB, 3D Tiles, and Cesium.
- Assistant: provider-backed AI with strict grounding, citations, and audit logs.

## Deployment Readiness

- Confirm Linux standalone Next build.
- Add production environment variable management.
- Add database migrations for Phase 6+ persisted entities.
- Add container health checks for API and web.
