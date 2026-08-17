# CityMind Tripoli Demo Script

## Local Run

```bash
corepack pnpm install
docker compose -f infra/docker-compose.yml up --build
```

Open:

```text
http://localhost:3000/dashboard
```

## Demo Flow

1. Dashboard: show Tripoli operating KPIs, priority areas, categories, and recent reports.
2. Map: show OpenStreetMap/MapLibre layers for reports, assets, and neighborhoods.
3. Reports: submit a citizen issue, request category suggestion, and update status.
4. Green Score: show formula weights and explainability breakdown.
5. Mobility: compare fastest, greenest, safest, walkable, and accessible route modes.
6. Simulator: run a before/after intervention scenario.
7. Predictions: inspect rule-based risk signals and evidence JSON.
8. Ask City: ask grounded questions and show unavailable-data behavior.
9. Admin: sign in with `admin.demo@citymind.local`, update report and asset status.
10. Digital Twin: show readiness boundary for future Cesium/3D Tiles work.

## Judge Notes

- Data is demo-only and Tripoli-specific.
- Advanced engines and 3D services are readiness interfaces, not active external integrations.
- The demo accounts use the production session controls, but they remain sample identities without MFA, recovery, SSO, or municipal approval.
