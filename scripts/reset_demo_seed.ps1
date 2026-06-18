Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..")
try {
  docker compose -f infra/docker-compose.yml up -d db
  Push-Location apps/api
  try {
    python -m app.seed.load_seed
  }
  finally {
    Pop-Location
  }
}
finally {
  Pop-Location
}
