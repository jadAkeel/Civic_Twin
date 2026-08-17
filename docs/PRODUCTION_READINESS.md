# Production readiness

CityMind has a hardened deployment profile and durable operational repositories. It is suitable for controlled staging and technical production validation. The bundled Tripoli data remains approximate demo data, so the system is not an official municipal system of record until authoritative data, operating procedures, and external integrations are supplied.

## Implemented controls

- PostgreSQL/PostGIS persistence for users, reports, assets, assistant history, audit events, rate limits, mobility data, metrics, and scenario results in production mode
- Alembic revision `20260803_0003`, migration-aware readiness checks, and a non-destructive `--if-empty` demo bootstrap
- Signed, expiring HS256 sessions bound to issuer, role, tenant key, token version, and CSRF token
- Secure HttpOnly cookies in production, CSRF validation for cookie-authenticated writes, bearer compatibility for non-browser clients, and durable logout/token revocation
- Distributed fixed-window rate limiting through PostgreSQL for authentication, report intake, and assistant requests
- Role-scoped report access, reporter-only personal history, and a redacted public report feed with sensitive locations removed
- Persistent structured audit events for authentication and operational changes
- A single current-data snapshot used by dashboards, metrics, predictions, mobility, scenarios, and RAG
- Grounded deterministic RAG with citations and refusal below the evidence threshold
- Optional OpenAI Responses API provider with pre-retrieval, Structured Outputs, `store=false`, PII redaction, hashed safety identifiers, bounded evidence, and labelled local fallback
- Scenario Simulator v2 with durable results, documented assumptions, uncertainty ranges, and `official_decision_ready=false`
- Request IDs, security headers, trusted-host enforcement, privacy-safe logs, and separate liveness/readiness endpoints
- Non-root/read-only application containers and CI coverage for unit, browser, dependency, container, and PostGIS integration checks

## Required production configuration

Copy `.env.production.example` to a private environment file. Never commit it. At minimum, set:

```dotenv
APP_ENV=production
DATABASE_URL=postgresql+psycopg://citymind:<encoded-password>@db:5432/citymind
DATABASE_READINESS_REQUIRED=true
OPERATIONAL_PERSISTENCE_BACKEND=database
SCENARIO_PERSISTENCE_BACKEND=database
RATE_LIMIT_BACKEND=database
AUTH_TOKEN_SECRET=<unique-random-secret-of-at-least-32-characters>
DOCS_ENABLED=false
CORS_ORIGINS=["https://citymind.example"]
TRUSTED_HOSTS=["api.citymind.example"]
```

The production Compose profile runs migrations, then executes `python -m app.seed.load_seed --if-empty`. That command never replaces an existing operational database. The bundled baseline is still demo-only and must be replaced through a governed municipal import before official use.

### Enabling OpenAI later

Local grounded RAG is the default and needs no API key. When a server-side key is available:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=<server-side-secret>
OPENAI_MODEL=gpt-5.6-sol
OPENAI_REASONING_EFFORT=low
AI_ALLOW_LOCAL_FALLBACK=true
```

Do not prefix the key with `NEXT_PUBLIC_` and do not place it in frontend configuration. Restart the API after changing the provider. `/ready` reports the selected provider without exposing the key.

## Deployment validation

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f infra/docker-compose.prod.yml up --build -d
curl --fail https://api.citymind.example/health
curl --fail https://api.citymind.example/ready
```

`/ready` returns 503 if PostgreSQL, PostGIS, the expected migration revision, or the minimum identity/metric baseline is unavailable. TLS termination is required for production because authentication cookies are Secure.

## Remaining external and governance blockers

1. Replace approximate seed coordinates and metrics with authoritative, licensed GIS and municipal datasets.
2. Configure durable object storage and malware-safe image ingestion before accepting stored citizen photos; automated image analysis is not enabled.
3. Configure official routing/traffic, notification, SMS/email/webhook, and agency dispatch integrations. Current queues never claim dispatch.
4. Calibrate and back-test simulation and prediction coefficients against measured projects. SUMO and MATSim remain explicitly `not_configured`.
5. Complete organizational tenancy policy, MFA/recovery, key rotation, backup/restore drills, monitoring/alerting, incident response, retention/deletion policy, accessibility review, and municipal security approval.
6. Review the selected hosted AI provider's regional processing and retention terms before sending production municipal data. The application sends only retrieved, redacted evidence and requests `store=false`, but provider governance remains an operator responsibility.
