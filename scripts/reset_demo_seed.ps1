Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..")
try {
  docker compose -f infra/docker-compose.yml up -d db
  Push-Location apps/api
  try {
    # Local reset only: demo accounts plus a destructive reload of the local database.
    $env:ALLOW_DEMO_USERS = "true"
    python -m app.seed.load_seed --force
  }
  finally {
    Pop-Location
  }
}
finally {
  Pop-Location
}
