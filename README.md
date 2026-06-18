# CityMind Tripoli

CityMind Tripoli is an AI-powered Urban Digital Twin and municipal intelligence
platform for Tripoli, Lebanon.

This repository now contains the Phase 17 prototype baseline: Tripoli-specific
frontend modules, seed-backed FastAPI endpoints, rule-based engines, readiness
interfaces, and validation coverage. It is still demo-only and must not be
treated as official municipal GIS or production operations software.

## Phase 1 Scope

- Monorepo structure with `apps/web`, `apps/api`, and `packages/shared`
- Next.js, TypeScript, and Tailwind frontend shell
- FastAPI backend with `GET /health`
- PostgreSQL/PostGIS, Redis, and MinIO local Docker Compose foundation
- Demo-only local environment variables
- Module folders for future service boundaries

## Phase 2 Scope

- SQLAlchemy database setup for the FastAPI app
- PostgreSQL/PostGIS-ready geospatial models
- Alembic migration setup and initial city model migration
- Tripoli-specific demo seed data in `data/tripoli_seed.json`
- Seed loader at `apps/api/app/seed/load_seed.py`
- Database import, seed integrity, and PostGIS readiness tests

Phase 2 data is demo-only and approximate. It is not official municipal GIS data.

## Implemented Prototype Scope

- Next.js application shell for all major CityMind Tripoli modules
- MapLibre/OpenStreetMap Tripoli map with seed-backed report, asset, and neighborhood layers
- Smart Reporter intake, local image placeholder, duplicate signal, and report status basics
- City Pulse dashboard aggregation endpoint and UI
- Green Score and Walkability formula endpoints with explainability breakdowns
- Rule-based Smart Mobility, Urban Scenario Simulator, and City Guardian predictions
- Grounded Ask Your City mock assistant with unavailable-data responses
- Local placeholder auth and municipality admin workflows
- Microservices, advanced simulation, and 3D digital twin readiness interfaces/docs

## Local Setup

Copy the example environment if you want local overrides:

```bash
cp .env.example .env
```

Install JavaScript dependencies:

```bash
pnpm install
```

Run frontend and backend through Docker Compose:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Run only the database:

```bash
docker compose -f infra/docker-compose.yml up --build -d db
```

Run frontend locally:

```bash
pnpm --filter @citymind/web dev
```

Open the frontend at:

```text
http://localhost:3000/dashboard
```

Run the API locally:

```bash
cd apps/api
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Run the Phase 2 database migration and load demo seed data:

```bash
docker compose -f infra/docker-compose.yml up --build -d db
cd apps/api
alembic upgrade head
python -m app.seed.load_seed
```

Check PostGIS in the local database:

```bash
docker compose -f infra/docker-compose.yml exec db psql -U citymind -d citymind -c "SELECT postgis_full_version();"
```

## Health Check

When the API is running:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "citymind-tripoli-api",
  "project": "CityMind Tripoli",
  "city": "Tripoli, Lebanon",
  "environment": "local",
  "version": "0.1.0"
}
```

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm --filter @citymind/web build
docker compose -f infra/docker-compose.yml config
python -m compileall apps/api/app
pytest apps/api/tests
node scripts/frontend_smoke.mjs
```

Or run the Makefile validation bundle:

```bash
make validate
```

## Demo and Planning Docs

- `docs/DEMO_SCRIPT.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/ROADMAP.md`
- `docs/MICROSERVICES_EXTRACTION.md`
- `docs/SIMULATION_READINESS.md`
- `docs/3D_DIGITAL_TWIN_READINESS.md`

## Current Limitations

- Persistence for Phase 6+ APIs is currently seed-backed or in-memory unless existing DB migrations are extended
- Auth is a local placeholder and not production RBAC/JWT security
- Advanced simulation adapters are readiness interfaces only; SUMO/MATSim are not required or installed
- 3D digital twin work is a readiness surface only; no Cesium token or 3D tiles are configured
- Seed data is demo-only and must be validated before municipal use
- Frontend pages use API-first loading with local fallback data for offline development
