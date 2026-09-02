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
- Local placeholder owner, municipality, police, Lebanese Red Cross, and Civil Defense demo portals
- Agency-filtered report queues, report detail panels, monthly summaries, hotspot sections, and filtered map views
- Microservices, advanced simulation, and 3D digital twin readiness interfaces/docs

## Citizen/Public Side Status

The public citizen side is the current hardened path for normal residents. It is
Arabic-first, RTL, and written for Lebanese citizens using clear natural Arabic.
Developer-facing contracts intentionally remain English: API routes, database
fields, enum values, role keys, slugs, environment variables, and test fixtures
keep their existing technical names so integrations and developer workflows do
not break. User-visible labels for those technical values are mapped at the UI
edge, primarily through `apps/web/lib/display-labels.ts` and feature option
files.

It includes:

- A mobile-first citizen entry page at `/`
- Citizen report intake at `/reports`
- Categories for `traffic_congestion`, `pothole`, `waste`, `security_incident`, and `other`
- Inline validation for required category, summary, description, Tripoli-bounded coordinates, manual-location fallback, and safe image metadata
- On-demand GPS only after the citizen taps the GPS button
- Manual location fallback when GPS is denied or unavailable
- Optional local photo preview with JPG, PNG, WebP, HEIC, and HEIF metadata validation up to 5 MB
- Clear submission confirmation with report ID, status, location source, upload status, and analysis status
- API failure messaging that does not create a fake municipal success

Current realism boundaries:

- Report persistence is still prototype in-memory/seed-backed unless production database work is extended.
- Agency portals use local placeholder roles only. They enforce demo visibility rules, but they are not production identity, tenancy, or emergency-dispatch systems.
- Police, Lebanese Red Cross, and Civil Defense queues are manual-review demo queues. No notification, dispatch, SMS, email, webhook, or official agency API provider is configured.
- Agency map layers are filtered views of approximate demo report coordinates. Official municipal GIS data is not configured.
- Photo storage is not configured; the frontend shows a local preview and the API accepts safe metadata only.
- Automated image analysis is not configured. The app must not claim car counts, congestion levels, pothole depth/size, waste risk, or security classification.
- Security, medical, and fire/public-safety reports are marked for manual review. For immediate danger, citizens should contact emergency services.
- Walking, green, shaded, cool, fastest, and alternative traffic routes are not production recommendations. `/mobility` shows an honest unavailable/configuration state and any seed routes are sample/demo-only.

Future production integrations should provide these environment-backed services before municipal use:

- `REPORT_IMAGE_STORAGE_BUCKET` / storage adapter for durable photo upload
- `IMAGE_ANALYSIS_PROVIDER` for configured computer vision analysis
- `ROUTING_PROVIDER` for production walking and route alternatives
- `TRAFFIC_PROVIDER` for live traffic/congestion data
- `SHADE_HEAT_PROVIDER` and `WALKABILITY_PROVIDER` for green, heat, shade, and sidewalk-quality routing inputs

## Local Demo Login

The app now opens with a local demo login screen. The login UI does not ask the
user to choose a role; citizen access is the default experience, and municipal
or agency access is unlocked only when the authenticated account already has
that role in the local seed/user store. These accounts are for development only:

| Role | Email | Password |
| --- | --- | --- |
| Owner / mayor | `owner.demo@citymind.local` | `owner-demo` |
| Municipality admin | `admin.demo@citymind.local` | `admin-demo` |
| Citizen | `citizen.demo@citymind.local` | `citizen-demo` |
| Police portal | `police.demo@citymind.local` | `agency-demo` |
| Lebanese Red Cross portal | `redcross.demo@citymind.local` | `agency-demo` |
| Civil Defense portal | `civildefense.demo@citymind.local` | `agency-demo` |

Passwords are checked with local PBKDF2 demo hashes from `data/tripoli_seed.json`. This is not production authentication, secure session management, or final municipal RBAC.

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

Run the local API and frontend together without guessing ports:

```bash
pnpm dev:local
```

The script prints the exact frontend, register, login, and API URLs. It keeps
the frontend on a CORS-allowed `3100`-`3107` port and points it at the matching
API process.

Run frontend only:

```bash
pnpm --filter @citymind/web dev
```

Open the frontend-only dev server at:

```text
http://localhost:3000/dashboard
```

Run the API locally:

```bash
cd apps/api
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8100
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
curl http://127.0.0.1:8100/health
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
pnpm --filter @citymind/web exec playwright install chromium
pnpm --filter @citymind/web test:e2e
docker compose -f infra/docker-compose.yml config
python -m compileall apps/api/app
pytest apps/api/tests
node scripts/frontend_smoke.mjs
```

Focused citizen-side checks:

```bash
python -m pytest apps/api/tests/test_reports_api.py
pnpm --filter @citymind/web test:e2e -- resident-flows.spec.ts
```

Focused agency-portal checks:

```bash
python -m pytest apps/api/tests/test_admin_auth_api.py apps/api/tests/test_reports_api.py
pnpm --filter @citymind/web test:e2e -- auth-admin.spec.ts
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
- Citizen photo upload is local-preview/metadata-only until object storage is configured
- Citizen report analysis returns `not_configured` or `manual_review_required` unless a real provider is wired
- Route guidance remains unavailable/demo-only until routing, traffic, shade, heat, and walkability providers are configured
- Advanced simulation adapters are readiness interfaces only; SUMO/MATSim are not required or installed
- 3D digital twin work is a readiness surface only; no Cesium token or 3D tiles are configured
- Seed data is demo-only and must be validated before municipal use
- Frontend pages use API-first loading with local fallback data for offline development
