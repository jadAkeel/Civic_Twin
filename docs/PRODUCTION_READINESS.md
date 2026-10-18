# Production readiness

CityMind ships a hardened production profile: TLS-terminated Docker Compose stack,
durable PostgreSQL/PostGIS repositories, and fail-closed configuration checks. The
bundled Tripoli data remains approximate demo data, so the system is not an official
municipal system of record until authoritative data, operating procedures and
external integrations are supplied.

## Implemented controls

**Identity and sessions**
- Signed, expiring HS256 sessions bound to issuer, role, tenant key, token version and a CSRF token
- HttpOnly + Secure cookies in production; the raw bearer token is only returned to API clients that ask with `?include_token=true`, so script injection cannot exfiltrate a portable credential
- Sliding sessions: `/auth/me` reissues the cookie inside the last `AUTH_TOKEN_REFRESH_THRESHOLD_SECONDS`; the web app re-validates every 5 minutes and on tab focus, and shows a clear "session expired" message
- Durable logout / revocation via token version, bumped on any role, status or password change
- Password policy (10+ characters, three character classes including Arabic letters, common/demo passwords and keyboard sequences rejected, email not allowed inside the password), enforced identically in the browser and the API
- PBKDF2-SHA256 at 310k iterations with NFKC normalisation; weaker legacy hashes are upgraded transparently at login
- Demo accounts exist only with `ALLOW_DEMO_USERS=true`, which is rejected in production; the first real owner comes from `BOOTSTRAP_OWNER_EMAIL` / `BOOTSTRAP_OWNER_PASSWORD`
- The last active owner cannot be demoted or deactivated

**Transport and browser**
- Caddy terminates TLS with automatic certificates; only ports 80/443 are published and the database sits on an internal network
- Per-request nonce Content-Security-Policy with `strict-dynamic` (no `unsafe-inline` or `unsafe-eval` for scripts), plus HSTS, frame denial, `nosniff`, COOP/CORP and a restrictive Permissions-Policy
- Uvicorn trusts `X-Forwarded-For` only from `FORWARDED_ALLOW_IPS`, so rate limits cannot be bypassed with forged headers
- Request bodies over `MAX_REQUEST_BODY_BYTES` are rejected before parsing; requests with a body must declare `Content-Length`

**API behaviour**
- One JSON error envelope (`detail`, `request_id`) for every error; validation errors name the field without echoing submitted values; database failures return 503 without internals
- Distributed rate limiting in PostgreSQL for login, registration, report intake, the assistant and every public read endpoint; the counter runs in its own transaction and expired buckets are swept automatically
- Report listings, filters, search (LIKE-escaped) and pagination run in SQL; dashboard and admin overview totals use `GROUP BY`; duplicate detection is an indexed proximity query
- Migration `20260922_0004` adds indexes for every hot query; `20260923_0005` rewrites legacy report category names in place so agency scoping, filters and statistics agree with the API
- Report status changes lock the row and are committed together with their audit event; repeating the current status is a no-op
- The public feed omits rejected and duplicate reports, shows citizen-written titles only after staff review, and gives sensitive (security, medical, fire) reports no location and day-precision dates; citizens never receive the ids of nearby sensitive reports
- Login throttling per account is shared across all client addresses (IPv6 grouped by /64); promoting a self-registered account to a staff role requires setting a new password; sliding sessions end after `AUTH_SESSION_MAX_AGE_SECONDS`
- Only `APP_ENV` values local/development/dev/test/testing/ci may run with the development token secret; any other name must provide its own
- In production the seed loads reference data only (never demo reports, predictions or assistant history) and `--force` is refused
- Every coordinate the API emits is GeoJSON order (`[longitude, latitude]`) regardless of backend
- Structured JSON logs (`LOG_FORMAT=json`) with request IDs and credential-bearing query parameters redacted

**Honest UI**
- The web app contains no sample or fallback city data. When the API is unreachable each screen says so and offers a retry; it never shows invented reports, KPIs, routes or assistant answers
- Maps show only live, privacy-redacted data: the public map reads `/reports/public` (sensitive categories carry no location) and `/assets/public`
- Route-level error, not-found and loading boundaries

## Required production configuration

Copy `.env.production.example` to `.env.production` on the server (`chmod 600`,
never commit it) and fill in every value. The Compose file refuses to start while
any required value is missing, and the API refuses to start with unsafe settings.

Key values:

```dotenv
WEB_DOMAIN=citymind.example
API_DOMAIN=api.citymind.example
ACME_EMAIL=ops@citymind.example
PUBLIC_API_URL=https://api.citymind.example
CORS_ORIGINS=["https://citymind.example"]
TRUSTED_HOSTS=["api.citymind.example"]
POSTGRES_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql+psycopg://citymind:<url-encoded-password>@db:5432/citymind
AUTH_TOKEN_SECRET=<output of: python -c "import secrets; print(secrets.token_urlsafe(48))">
BOOTSTRAP_OWNER_EMAIL=<the first owner's email>
BOOTSTRAP_OWNER_PASSWORD=<unique passphrase>
PUBLIC_WEB_URL=https://citymind.example
DATA_CONTROLLER_NAME=<the organisation responsible for the data>
PRIVACY_CONTACT_EMAIL=<where residents send data requests>
EMAIL_FROM=no-reply@citymind.example
SMTP_HOST=<smtp relay host>
SMTP_USERNAME=<smtp user>
SMTP_PASSWORD=<smtp password or API key>
```

Point the DNS records of both domains at the server before the first start so
Caddy can obtain certificates.

### Account email (verification and password reset)

Production requires `EMAIL_BACKEND=smtp` (the Compose file sets it). Any SMTP
relay works; common choices:

| Provider | `SMTP_HOST` | `SMTP_USERNAME` |
|---|---|---|
| Amazon SES | `email-smtp.<region>.amazonaws.com` | SES SMTP user |
| SendGrid | `smtp.sendgrid.net` | `apikey` |
| Brevo | `smtp-relay.brevo.com` | account login |

Verify the sending domain with the provider (SPF and DKIM DNS records) or the
messages land in spam. With verification on (the production default):

- Registration answers the same `202` for new and existing addresses, so it no
  longer reveals who has an account; the owner of an existing account gets a
  heads-up email instead.
- New residents cannot sign in until they follow the emailed link (48 hours).
- `/forgot-password` always answers the same way; reset links are single-use,
  expire after 30 minutes, sign the user out everywhere and send a "password
  changed" notice. Links carry the token in the URL fragment, so it never reaches
  server or proxy logs.
- Messages are sent after the response, so a slow mail server never blocks a
  request. Delivery failures are logged as `email_delivery_failed`.

Locally, `EMAIL_BACKEND=console` prints each message (with its link) in the API log.

### Privacy notice

`/privacy` is public and linked from sign-in, registration and every page footer.
Registration requires accepting it, and the accepted version
(`PRIVACY_POLICY_VERSION`) is stored in the registration audit event. Fill in
`DATA_CONTROLLER_NAME` and `PRIVACY_CONTACT_EMAIL` (the build refuses to start
without them) and **have the text reviewed by legal counsel** against Law 81/2018
and the municipality's own policies before launch. When the text changes, bump
`POLICY_VERSION` in `apps/web/app/privacy/page.tsx` and `PRIVACY_POLICY_VERSION`.

### Monitoring and alerting

- **Uptime:** `.github/workflows/uptime.yml` probes `/health`, `/ready`, the web app
  and certificate expiry every 10 minutes from GitHub's network. Set the
  repository variables `CITYMIND_API_URL` and `CITYMIND_WEB_URL`; a failed run
  notifies through GitHub. For SMS or on-call paging, also point an uptime
  service (Better Stack, UptimeRobot) at `https://<api>/ready`, which returns 503
  when the database, PostGIS or migrations are unhealthy. `scripts/uptime_check.sh`
  runs the same checks from any cron.
- **Errors:** set `SENTRY_DSN` to send API exceptions and web crash reports to
  Sentry. Request bodies, cookies, auth/CSRF headers, query strings and client IPs
  are stripped before anything is sent. The web app's error screens report to
  `POST /telemetry/client-errors`, which is rate-limited and also logged as
  `web_client_error` for log-based alerting.
- **Logs:** `LOG_FORMAT=json` (set in production) emits one JSON line per request
  with a request id; alert on `status >= 500`, `email_delivery_failed` and
  `assistant_provider_unavailable`.

### Enabling Google Gemini

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=<Google AI Studio key>
GEMINI_MODEL=gemini-3.5-flash-lite
AI_ALLOW_LOCAL_FALLBACK=true
```

The key is read by the API only. Questions are redacted before they are sent, only
retrieved evidence snippets are included, the caller's identity is never sent, and
blocked, failed or ungrounded responses fall back to the labelled local answer.
OpenAI works the same way with `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Restart
the API after changing provider; `/ready/details` (owner or municipality admin
sign-in required) shows `ai.status` (`configured` or `missing_api_key`) without
exposing the key; the public `/ready` only says whether the service is ready.
Hosted answers that contain links, contact details or figures absent from the
evidence are discarded in favour of the local answer, stored questions are redacted,
and `AI_HOSTED_DAILY_REQUEST_LIMIT` caps daily spend per API worker. Google shut
down `gemini-2.0-flash` on 2026-06-01; check Google's deprecation page before
pinning another model. Review the provider's data-processing and retention terms
before sending municipal data.

## Deploy

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f infra/docker-compose.prod.yml up --build -d
curl --fail https://api.citymind.example/health
curl --fail https://api.citymind.example/ready
```

Start-up order is enforced: PostGIS → `alembic upgrade head` → baseline seed
(`--if-empty`, never overwrites existing data) → API → web → Caddy. `/ready` returns
503 until PostgreSQL, PostGIS, the expected migration and a usable account exist.

To update, pull the new code and run the same `up --build -d`; migrations run first
and the seed step is a no-op on a populated database.

## Backups

```bash
sh scripts/backup_db.sh /var/backups/citymind 14
```

Schedule it daily from cron and copy the dumps off the server. Restore with
`pg_restore --clean --if-exists --no-owner`. Test a restore before go-live.

## Continuous integration

`.github/workflows/ci.yml` runs API unit tests, the API against a real PostGIS
service (migrations, seed, SQL paths, migration downgrade/upgrade), web lint,
typecheck, build and Playwright browser tests, dependency audits, and container
builds including a check that the web image serves its static assets.

## Remaining external and governance blockers

These need people, data or contracts rather than code:

1. Replace approximate seed coordinates and metrics with authoritative, licensed GIS and municipal datasets.
2. Configure durable object storage and malware-safe image ingestion before accepting stored citizen photos; automated image analysis is not enabled.
3. Configure official routing/traffic, notification (SMS/email/webhook) and agency dispatch integrations. Current queues never claim dispatch.
4. Calibrate and back-test simulation and prediction coefficients against measured projects.
5. Decide organisational policy for MFA/SSO, audit-log retention and data deletion, and key rotation; have the privacy notice reviewed by counsel; run a penetration test and an accessibility review; obtain municipal security approval.
