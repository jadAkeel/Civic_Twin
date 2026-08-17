# Known limitations

- The bundled Tripoli seed is approximate demo data, not official municipal GIS or a production system of record.
- PostgreSQL/PostGIS is the required production backend; local/test mode intentionally keeps bounded in-memory stores for fast development.
- Browser sessions use Secure HttpOnly cookies in production and durable token-version revocation, but MFA, account recovery, SSO, and full multi-organization tenancy are not implemented.
- The assistant is grounded in local CityMind evidence. OpenAI is optional and inactive until `AI_PROVIDER=openai` and a server-side key are configured. Local retrieval remains lexical rather than embedding/vector based.
- Predictions are transparent, uncalibrated rules and are not official alerts or ML forecasts.
- Scenario Simulator v2 is an uncalibrated planning model. SUMO and MATSim adapters report `not_configured` and do not run external binaries.
- Mobility uses the CityMind/PostGIS graph but has no live traffic or official routing provider; it is not navigation guidance.
- Citizen photo storage and automated image analysis are disabled. Only validated metadata and a browser-local preview are supported.
- GIS, notifications, SMS/email/webhooks, agency dispatch, live traffic, object storage, and 3D tile services require external credentials/data and remain `not_configured`.
- Production operation still requires authoritative data governance, backups, observability/alerting, retention policy, accessibility validation, penetration testing, and municipal approval.
- Windows builds disable Next standalone output to avoid local symlink permission failures; Linux production images use standalone output.
