# Known limitations

- The bundled Tripoli seed is approximate demo data, not official municipal GIS or a production system of record.
- PostgreSQL/PostGIS is the required production backend; local/test mode intentionally keeps bounded in-memory stores for fast development.
- Browser sessions use Secure HttpOnly cookies in production with sliding expiry and durable token-version revocation, but MFA, self-service account recovery, SSO, and full multi-organization tenancy are not implemented. Password resets are done by an owner from the admin page.
- The assistant is grounded in local CityMind evidence. Google Gemini (`AI_PROVIDER=gemini`) and OpenAI (`AI_PROVIDER=openai`) are optional and only rephrase retrieved evidence once a server-side key is configured. Local retrieval remains lexical rather than embedding/vector based.
- Predictions are transparent, uncalibrated rules and are not official alerts or ML forecasts.
- Scenario Simulator v2 is an uncalibrated planning model. SUMO and MATSim adapters report `not_configured` and do not run external binaries.
- Mobility uses the CityMind/PostGIS graph but has no live traffic or official routing provider; it is not navigation guidance.
- Citizen photo storage and automated image analysis are disabled. Only validated metadata and a browser-local preview are supported.
- GIS, notifications, SMS/email/webhooks, agency dispatch, live traffic, object storage, and 3D tile services require external credentials/data and remain `not_configured`.
- Production operation still requires authoritative data governance, backups, observability/alerting, retention policy, accessibility validation, penetration testing, and municipal approval.
- Next standalone output is enabled explicitly with `NEXT_OUTPUT=standalone` (set in the web Dockerfile); local builds use the default output.
- Audit events and rate-limit history are kept indefinitely except for automatic sweeping of expired rate-limit buckets; an audit retention period must be set by the municipality's data-governance policy.
- The web app is rendered per request so every page carries a fresh CSP nonce; this trades static page caching for script-injection protection.
- Email verification and password reset need a working SMTP relay. With `EMAIL_VERIFICATION_REQUIRED=false` (the local default) registration still answers "email already registered" (409) and can confirm that an address has an account; production turns verification on, which removes that signal.
- Data-subject requests (access, correction, deletion) are handled by email to `PRIVACY_CONTACT_EMAIL`; there is no self-service account deletion yet.
- The per-account login throttle is shared across all addresses, which blocks password spraying but means repeated failed attempts can briefly lock a real user out for one `LOGIN_WINDOW_SECONDS` window.
- The hosted-model daily budget (`AI_HOSTED_DAILY_REQUEST_LIMIT`) is counted per API worker process; with `API_WORKERS=2` the effective ceiling is twice the configured value.
