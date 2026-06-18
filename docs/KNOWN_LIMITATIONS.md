# Known Limitations

- Demo seed data is approximate and not official municipal GIS data.
- Phase 6+ API state is seed-backed or in-memory unless the database layer is extended.
- Local auth tokens are placeholders and must not be used as production security.
- The assistant uses a deterministic mock provider and no real AI API key.
- Predictions are rule-based and auditable; there is no ML training pipeline.
- Mobility routing uses seed edges only and no external routing server.
- Scenario simulation is rule-based and does not run SUMO, MATSim, or A/B Street.
- Digital twin support is readiness-only and has no Cesium token or 3D tile service.
- Windows builds disable Next standalone output to avoid local symlink permission failures.
