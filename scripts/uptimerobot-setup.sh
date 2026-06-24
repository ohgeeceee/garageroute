#!/bin/bash
# Create / update the GarageRoute external uptime monitor on UptimeRobot.
#
# Why this exists: the primary external monitor is the GitHub Actions
# workflow at .github/workflows/uptime-monitor.yml — free, zero-setup.
# Use UptimeRobot instead if you want stricter 5-min SLAs, a public
# status page, or want alerts off-GitHub (SMS, Slack, PagerDuty, etc).
#
# Run once on any machine with curl + jq:
#
#   1. Sign up at https://uptimerobot.com (free tier = 50 monitors,
#      5-min checks, email alerts).
#   2. Grab your main API key from
#      https://dashboard.uptimerobot.com/integration.php?action=apikey
#      (the "Read-Only" key won't work — you need the "Main" key).
#   3. bash scripts/uptimerobot-setup.sh --api-key re_xxxxxxxxxxxxxxxx
#
# Re-running is idempotent: it looks for an existing monitor with the
# same friendly_name and updates it instead of creating a duplicate.

set -euo pipefail

API="https://api.uptimerobot.com/v2"
FRIENDLY_NAME="GarageRoute /api/health"
TARGET_URL="https://garageroute.com/api/health"
INTERVAL=300  # 5 min — UptimeRobot free tier minimum.

usage() {
  cat <<USG
Usage: $0 --api-key <key>

Or set UPTIMEROBOT_API_KEY in the environment. The API key is the
"Main" key from
https://dashboard.uptimerobot.com/integration.php?action=apikey
(not the Read-Only key).
USG
  exit 1
}

api_key="${UPTIMEROBOT_API_KEY:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-key) api_key="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "unknown arg: $1" >&2; usage ;;
  esac
done
[[ -n "$api_key" ]] || usage

# List monitors; filter by friendly_name.
list_resp=$(curl -sS -X POST "$API/getMonitors" \
  --data-urlencode "api_key=$api_key" \
  --data-urlencode "format=json" \
  --data-urlencode "search=$FRIENDLY_NAME")
existing_id=$(echo "$list_resp" | jq -r --arg n "$FRIENDLY_NAME" \
  '.monitors[]? | select(.friendly_name == $n) | .id' | head -n1)
existing_id="${existing_id:-}"

if [[ -n "$existing_id" && "$existing_id" != "null" ]]; then
  echo "found existing monitor id=$existing_id — updating"
  resp=$(curl -sS -X POST "$API/editMonitor" \
    --data-urlencode "api_key=$api_key" \
    --data-urlencode "format=json" \
    --data-urlencode "id=$existing_id" \
    --data-urlencode "url=$TARGET_URL" \
    --data-urlencode "friendly_name=$FRIENDLY_NAME" \
    --data-urlencode "type=1" \
    --data-urlencode "interval=$INTERVAL")
else
  echo "no existing monitor — creating"
  resp=$(curl -sS -X POST "$API/newMonitor" \
    --data-urlencode "api_key=$api_key" \
    --data-urlencode "format=json" \
    --data-urlencode "url=$TARGET_URL" \
    --data-urlencode "friendly_name=$FRIENDLY_NAME" \
    --data-urlencode "type=1" \
    --data-urlencode "interval=$INTERVAL")
fi

stat=$(echo "$resp" | jq -r '.stat // empty')
if [[ "$stat" != "ok" ]]; then
  echo "UptimeRobot API error:" >&2
  echo "$resp" | jq . >&2
  exit 2
fi

monitor_id=$(echo "$resp" | jq -r '.monitor.id // .monitors[0].id // empty')
echo
echo "OK — monitor id=$monitor_id"
echo "URL:    $TARGET_URL"
echo "Name:   $FRIENDLY_NAME"
echo "Check:  every ${INTERVAL}s"
echo
echo "Verify in the dashboard: https://dashboard.uptimerobot.com/monitors"
echo
echo "Recommended next steps:"
echo "  - Add an SMS / Slack / PagerDuty alert contact at"
echo "    https://dashboard.uptimerobot.com/alertContacts"
echo "  - (paid) Enable the public status page at"
echo "    https://dashboard.uptimerobot.com/publicStatusPage"
echo "    and link it from your footer / status page."
