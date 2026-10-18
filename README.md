# CityMind Tripoli

CityMind Tripoli is a civic reporting, map, and municipal operations prototype
for Tripoli, Lebanon.

The application is hardened for production deployment (see
`docs/PRODUCTION_READINESS.md`): TLS termination, durable PostgreSQL/PostGIS
storage, nonce-based CSP, rate limiting, audit events, and CI. The bundled Tripoli
baseline data is still approximate demo data and must be replaced with
authoritative municipal datasets before it is treated as official GIS.

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
- Rule-based Smart Mobility, neighborhood-calibrated Urban Scenario Simulator v2, and City Guardian risk signals
- Grounded Ask Your City retrieval with citations, confidence, unavailable-data responses, and an optional OpenAI Responses API provider
- Durable production auth with HttpOnly cookies, CSRF protection, token revocation, rate limiting, audit events, and municipality admin workflows
- Local placeholder owner, municipality, police, Lebanese Red Cross, and Civil Defense demo portals
- Agency-filtered report queues with search, triage sorting, report detail panels, monthly summaries, hotspot sections, and filtered map views
- Navigation is role-focused: citizen primary navigation stays on reporting, the map, and routing readiness; planning analytics and data-review tools are kept in municipal navigation.
- Microservices, advanced simulation, and 3D digital twin readiness interfaces/docs

### Scenario Simulator v2

The municipality-only simulator now adjusts action effects using each selected
neighborhood's green, air, waste, walkability, heat, and open-report baseline.
It models a small set of explicit action interactions, supports pilot/standard/
expanded intensity, sequential or parallel delivery, an optional budget cap,
projected before/after scores, and uncertainty ranges. Every response includes
its methodology version, sources, assumptions, warnings, and
`official_decision_ready=false`. Production mode stores new results in Postgres;
local tests use a bounded in-memory repository.

This is a transparent planning model, not a causal forecast or engineering
study. Its demo baselines must be replaced and calibrated with official data
before municipal decisions.

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
- Categories for `traffic_congestion`, `pothole`, `waste`, `security_incident`, `medical_emergency`, `fire_hazard`, and `other`
- Inline validation for required category, summary, description, Tripoli-bounded coordinates, manual-location fallback, and safe image metadata
- On-demand GPS only after the citizen taps the GPS button
- Manual location fallback when GPS is denied or unavailable
- Optional local photo preview with JPG, PNG, WebP, HEIC, and HEIF metadata validation up to 5 MB
- Clear submission confirmation with report ID, status, location source, manual-review path, upload status, and analysis status
- API failure messaging that does not create a fake municipal success

Current realism boundaries:

- Reports, users, assets, audit events, assistant history, rate limits, and scenario results persist in PostgreSQL/PostGIS in production; local/test mode uses bounded in-memory stores.
- Agency portals enforce durable role-based access in production, but they are not official emergency-dispatch systems and still require final organizational tenancy and identity governance.
- Police, Lebanese Red Cross, and Civil Defense queues are manual-review demo queues. No notification, dispatch, SMS, email, webhook, or official agency API provider is configured.
- Agency report queues support local search, status/category filters, and triage/date/status sorting. These controls only organize visible reports; they do not create official assignments or dispatches.
- Agency report details include role-specific operator checklists for Lebanese Red Cross, Police, Civil Defense, and municipality users. They state what is known, what is not configured, and what requires manual escalation or review.
- Municipality dashboard panels show explicit empty states and data-source notes instead of blank charts when the connected service has no reports.
- Agency map layers are filtered views of approximate demo report coordinates. Official municipal GIS data is not configured.
- Map markers are agency-oriented: Lebanese Red Cross (`+`) for medical aid, Municipality (`M`) for municipal service reports, Police (`P`) for public-safety reports, Civil Defense (`F`) for fire/rescue hazards, Citizen (`C`) for user-selected report locations, and Asset (`A`) for municipal assets. The in-app legend is the source of truth for these meanings.
- `/predictions` is a municipal review list of rule-based risk signals only. It is not an official prediction, alerting, dispatch, or external-notification system.
- Photo storage is not configured; the frontend shows a local preview and the API accepts safe metadata only.
- Automated image analysis is not configured. The app must not claim car counts, congestion levels, pothole depth/size, waste risk, or security classification.
- Security, medical, and fire/public-safety reports are marked for manual review. For immediate danger, citizens should contact emergency services.
- Walking, green, shaded, cool, fastest, and alternative traffic routes are not production recommendations. `/mobility` shows an honest unavailable/configuration state and any seed routes are sample/demo-only.
- `/green-score` and `/ask-city` remain available as municipal planning/data-review routes, but they are hidden from citizen primary navigation because they are not direct resident tasks.
- `/digital-twin` is a municipal planning/readiness route. It is not in primary navigation and citizen accounts are redirected away from it until official 3D/GIS sources are configured.

Future production integrations should provide these environment-backed services before municipal use:

- `REPORT_IMAGE_STORAGE_BUCKET` / storage adapter for durable photo upload
- `IMAGE_ANALYSIS_PROVIDER` for configured computer vision analysis
- `ROUTING_PROVIDER` for production walking and route alternatives
- `TRAFFIC_PROVIDER` for live traffic/congestion data
- `SHADE_HEAT_PROVIDER` and `WALKABILITY_PROVIDER` for green, heat, shade, and sidewalk-quality routing inputs

## Local Demo Login

The app opens with a login screen. The login UI does not ask the user to choose a
role; citizen access is the default experience, and municipal or agency access is
unlocked only when the authenticated account already has that role.

The accounts below exist **only when `ALLOW_DEMO_USERS=true`**, which the local
dev script and `infra/docker-compose.yml` set for you. Their passwords are
published here, so the API refuses to start in production with that flag on, and
the seed loader refuses to create them in a production database.

| Role | Email | Password |
| --- | --- | --- |
| Owner / mayor | `owner.demo@citymind.local` | `owner-demo` |
| Municipality admin | `admin.demo@citymind.local` | `admin-demo` |
| Citizen | `citizen.demo@citymind.local` | `citizen-demo` |
| Police portal | `police.demo@citymind.local` | `agency-demo` |
| Lebanese Red Cross portal | `redcross.demo@citymind.local` | `agency-demo` |
| Civil Defense portal | `civildefense.demo@citymind.local` | `agency-demo` |

Sessions are signed, expiring and revocable. Browsers hold them in an HttpOnly
cookie (Secure in production) and send a CSRF token on every write; the raw bearer
token is only returned to API clients that request it with `?include_token=true`.
Active sessions slide forward while the operator works. New passwords must be at
least 10 characters and combine three of: Arabic letters, lowercase, uppercase,
digits, symbols or spaces; weak and common passwords are rejected.

## Production Accounts

Production starts with exactly one account, created from
`BOOTSTRAP_OWNER_EMAIL` / `BOOTSTRAP_OWNER_PASSWORD` when the database is first
seeded. Sign in with it, create named accounts for staff from **الإدارة →
إدارة الصلاحيات**, then rotate the bootstrap password. The API refuses to demote
or deactivate the last active owner, so the organisation cannot lock itself out.

## AI Assistant Provider

The assistant always retrieves evidence from CityMind data first and refuses when
nothing matches. A hosted model, if configured, only rephrases that evidence:

| `AI_PROVIDER` | Needs | Behaviour |
| --- | --- | --- |
| `local_rag` (default) | nothing | Deterministic answers from local evidence |
| `gemini` | `GEMINI_API_KEY` (Google AI Studio) | Gemini phrases the retrieved evidence as structured JSON |
| `openai` | `OPENAI_API_KEY` | OpenAI Responses API with `store=false` |

Keys are server-side only — never prefix them with `NEXT_PUBLIC_`. Questions are
redacted (emails, phone numbers, long identifiers) before they leave the server,
the caller's identity is never sent, and if the provider fails, blocks the request
or returns an ungrounded answer, the API falls back to the local answer and labels
it (`AI_ALLOW_LOCAL_FALLBACK=false` turns that into a 503). `/ready/details`
(owner or municipality admin only) reports the provider and whether its key is
present, never the key itself; the public `/ready` only reports readiness.

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

For the hardened deployment profile and its required environment contract, see
`docs/PRODUCTION_READINESS.md` and `infra/docker-compose.prod.yml`.

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
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8100
```

Run the Phase 2 database migration and load demo seed data:

```bash
docker compose -f infra/docker-compose.yml up --build -d db
cd apps/api
alembic upgrade head
python -m app.seed.load_seed --if-empty
```

Omit `--if-empty` only when intentionally resetting a disposable local database;
the unguarded loader replaces CityMind tables with the labelled demo baseline.

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
pnpm audit:prod
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

## Current limitations

See `docs/KNOWN_LIMITATIONS.md`. The major remaining blockers are authoritative
municipal data, photo/object storage, official GIS/routing/notification/dispatch
providers, calibrated simulation, MFA/recovery/SSO, and production operations
such as backup drills, alerting, retention policy, and security approval.
