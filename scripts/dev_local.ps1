param(
  [int]$PreferredApiPort = 8100,
  [int[]]$WebPorts = @(3100, 3101, 3102, 3103, 3104, 3105, 3106, 3107)
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root ".codex-runtime"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
$PreferredWebPort = $WebPorts[0]

function Test-ListeningPort {
  param([int]$Port)

  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Stop-PortOwner {
  param(
    [int]$Port,
    [string]$Label
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

  foreach ($processId in $processIds) {
    if ($processId -le 0 -or $processId -eq $PID) {
      throw "Port $Port is held by process $processId and cannot be stopped safely."
    }

    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
      continue
    }

    Write-Output "Stopping $Label port $Port owner: PID $processId ($($process.ProcessName))"
    Stop-Process -Id $processId -Force -ErrorAction Stop
  }

  for ($attempt = 1; $attempt -le 20; $attempt++) {
    if (-not (Test-ListeningPort -Port $Port)) {
      return
    }
    Start-Sleep -Milliseconds 250
  }

  throw "Port $Port is still busy after stopping its owner process."
}

function Test-CityMindApi {
  param([int]$Port)

  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
    if ($health.service -ne "citymind-tripoli-api") {
      return $false
    }

    $openApi = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/openapi.json" -TimeoutSec 3
    return [bool]($openApi.paths.PSObject.Properties.Name -contains "/auth/register")
  } catch {
    return $false
  }
}

function Start-CityMindApi {
  param([int]$Port)

  $stdout = Join-Path $RuntimeDir "api-dev-$Port.log"
  $stderr = Join-Path $RuntimeDir "api-dev-$Port.err.log"
  Start-Process `
    -FilePath "powershell" `
    -ArgumentList @("-NoProfile", "-Command", "python -m uvicorn app.main:app --host 127.0.0.1 --port $Port") `
    -WorkingDirectory (Join-Path $Root "apps\api") `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden | Out-Null

  for ($attempt = 1; $attempt -le 30; $attempt++) {
    if (Test-CityMindApi -Port $Port) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "API did not become ready on port $Port. Check $stderr."
}

function Start-CityMindWeb {
  param(
    [int]$Port,
    [int]$ApiPort
  )

  $stdout = Join-Path $RuntimeDir "web-dev-$Port.log"
  $stderr = Join-Path $RuntimeDir "web-dev-$Port.err.log"
  $command = "`$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:$ApiPort'; corepack pnpm --filter @citymind/web exec next dev -H 127.0.0.1 -p $Port"
  Start-Process `
    -FilePath "powershell" `
    -ArgumentList @("-NoProfile", "-Command", $command) `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden | Out-Null

  for ($attempt = 1; $attempt -le 40; $attempt++) {
    try {
      Invoke-WebRequest -Uri "http://127.0.0.1:$Port/register" -UseBasicParsing -TimeoutSec 3 | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  throw "Web app did not become ready on port $Port. Check $stderr."
}

if (Test-ListeningPort -Port $PreferredApiPort) {
  Stop-PortOwner -Port $PreferredApiPort -Label "API"
}

$apiPort = $PreferredApiPort
Write-Output "Starting CityMind API on http://127.0.0.1:$apiPort"
Start-CityMindApi -Port $apiPort

if (Test-ListeningPort -Port $PreferredWebPort) {
  Stop-PortOwner -Port $PreferredWebPort -Label "web"
}

$webPort = $PreferredWebPort
Write-Output "Starting CityMind web on http://127.0.0.1:$webPort"
Start-CityMindWeb -Port $webPort -ApiPort $apiPort

$urlSummary = @"
CityMind local dev is ready:
  Web:      http://127.0.0.1:$webPort
  Register: http://127.0.0.1:$webPort/register
  Login:    http://127.0.0.1:$webPort/login
  API:      http://127.0.0.1:$apiPort

Logs are in $RuntimeDir
"@

$urlFile = Join-Path $RuntimeDir "dev-local-urls.txt"
Set-Content -Path $urlFile -Value $urlSummary -Encoding UTF8
Write-Output ""
Write-Output $urlSummary
Write-Output "Saved URLs to $urlFile"
