# CityMind Tripoli Roadmap

## Next Engineering Steps

- Add governed import pipelines and provenance/version records for authoritative municipal datasets.
- Extend Playwright coverage as new critical workflows are added; auth, reports, agency views, simulation, navigation, and security headers are covered.
- Add MFA, recovery, SSO/identity-provider integration, key rotation, and finalized organization tenancy.
- Add event contracts before extracting microservices.
- Validate Tripoli GIS and operational data with municipal or trusted local sources.

## Future Integrations

- Routing: OpenTripPlanner, GraphHopper, or Valhalla.
- Simulation: SUMO and MATSim adapters.
- 3D: CityGML, 3DCityDB, 3D Tiles, and Cesium.
- Assistant: evaluate retrieval quality and provider behavior against an approved municipal benchmark before production use.

## Deployment Readiness

- Run the prepared Linux standalone Next container build in CI and deployment environments.
- Connect production environment values to the target secret manager.
- Exercise migration, seed-bootstrap, backup, restore, and rollback procedures against a staging copy.
- Exercise the existing API and web container health checks in the deployment environment.
