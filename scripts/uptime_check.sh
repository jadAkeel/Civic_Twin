#!/bin/sh
# Probe the public CityMind endpoints; exits non-zero (and says why) when any fails.
# Used by .github/workflows/uptime.yml, and usable from cron on another machine:
#   */5 * * * * CITYMIND_API_URL=https://api.x CITYMIND_WEB_URL=https://x sh uptime_check.sh || <alert>
# Each check is retried so one dropped packet does not raise an alarm.
set -u

API_URL="${CITYMIND_API_URL:?set CITYMIND_API_URL}"
WEB_URL="${CITYMIND_WEB_URL:?set CITYMIND_WEB_URL}"
ATTEMPTS="${UPTIME_ATTEMPTS:-3}"
failures=0

probe() {
  name="$1"
  url="$2"
  expect="$3"
  attempt=1
  while [ "$attempt" -le "$ATTEMPTS" ]; do
    body=$(curl --silent --show-error --max-time 15 --write-out '\n%{http_code}' "$url" 2>&1)
    status=$(printf '%s' "$body" | tail -n 1)
    if [ "$status" = "200" ] && printf '%s' "$body" | grep -q "$expect"; then
      echo "ok    $name ($url)"
      return 0
    fi
    attempt=$((attempt + 1))
    [ "$attempt" -le "$ATTEMPTS" ] && sleep 10
  done
  echo "FAIL  $name ($url) -> HTTP $status"
  printf '%s\n' "$body" | head -c 600
  echo
  failures=$((failures + 1))
  return 1
}

probe "api liveness" "$API_URL/health" '"status":"ok"'
# 503 with the failing check names when the database, PostGIS or migrations break.
probe "api readiness" "$API_URL/ready" '"status":"ready"'
probe "web app" "$WEB_URL/login" 'CityMind'

# TLS certificates renew automatically; warn two weeks before one would lapse.
for url in "$API_URL" "$WEB_URL"; do
  host=$(printf '%s' "$url" | sed -E 's#^https?://([^/:]+).*#\1#')
  expiry=$(printf '' | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$expiry" ]; then
    expires=$(date -d "$expiry" +%s 2>/dev/null || echo 0)
    remaining=$(( (expires - $(date +%s)) / 86400 ))
    if [ "$expires" -gt 0 ] && [ "$remaining" -lt 14 ]; then
      echo "FAIL  certificate for $host expires in $remaining days"
      failures=$((failures + 1))
    else
      echo "ok    certificate for $host ($remaining days left)"
    fi
  fi
done

if [ "$failures" -gt 0 ]; then
  echo "$failures uptime check(s) failed"
  exit 1
fi
echo "all uptime checks passed"
