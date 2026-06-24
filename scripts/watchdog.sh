#!/bin/bash
# GarageRoute self-hosted watchdog.
#
# Runs via systemd timer (every 5 min) on the VPS. Probes /api/health,
# tracks consecutive failures, fires ONE alert per outage (re-arms on
# recovery). Catches "app crashed but nginx is up" cases — the
# schema-drift guard catches the deploy-time side, this catches the
# runtime side.
#
# This is the SAME-VPS monitor. It will not run if the VPS itself is
# down. For VPS-level outages, pair it with an external monitor
# (UptimeRobot / Better Stack / Cronitor) — see DEPLOY.md § 6.
#
# Config: /etc/garageroute-watchdog.env (loaded if present, all vars
# optional). State: /var/lib/garageroute-watchdog/. Logs:
# /var/log/garageroute-watchdog.log.
#
# Required env (defaults shown):
#   HEALTH_URL         https://garageroute.com/api/health
#   FAIL_THRESHOLD     3  (consecutive failures before alerting)
#   STATE_DIR          /var/lib/garageroute-watchdog
#   ALERT_LOG          /var/log/garageroute-watchdog.log
#   ALERT_WEBHOOK_URL  (empty = log only)
#
# Webhook payload (JSON POST):
#   {"text":"…","source":"garageroute-watchdog","count":N,"http_code":"…"}
# Point this at Slack incoming-webhook, Discord webhook, a Resend
# relay, or anything that accepts JSON POSTs.
#
# Exit codes:
#   0 = healthy (or below threshold)
#   1 = alert fired this run

set -uo pipefail

ENV_FILE="${ENV_FILE:-/etc/garageroute-watchdog.env}"
[[ -f "$ENV_FILE" ]] && . "$ENV_FILE"

HEALTH_URL="${HEALTH_URL:-https://garageroute.com/api/health}"
FAIL_THRESHOLD="${FAIL_THRESHOLD:-3}"
STATE_DIR="${STATE_DIR:-/var/lib/garageroute-watchdog}"
ALERT_LOG="${ALERT_LOG:-/var/log/garageroute-watchdog.log}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

mkdir -p "$STATE_DIR"
COUNT_FILE="$STATE_DIR/fail_count"
ALERTED_FILE="$STATE_DIR/alerted"

count=0; alerted=0
[[ -f "$COUNT_FILE"   ]] && count=$(tr -dc '0-9' < "$COUNT_FILE"   2>/dev/null)
[[ -f "$ALERTED_FILE" ]] && alerted=$(tr -dc '01' < "$ALERTED_FILE" 2>/dev/null)
: "${count:=0}"; : "${alerted:=0}"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*" >> "$ALERT_LOG"; }

# Probe. Require HTTP 200 AND body.ok == true (the /api/health contract).
body=$(mktemp)
http_code=$(curl -sS -o "$body" -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
ok="false"
if [[ "$http_code" == "200" ]] && grep -q '"ok":true' "$body" 2>/dev/null; then
  ok="true"
fi
rm -f "$body"

if [[ "$ok" == "true" ]]; then
  if (( count > 0 )); then
    log "recovered after $count consecutive failure(s)"
    echo 0 > "$COUNT_FILE"
    echo 0 > "$ALERTED_FILE"
  fi
  exit 0
fi

count=$((count + 1))
echo "$count" > "$COUNT_FILE"
log "unhealthy: count=$count threshold=$FAIL_THRESHOLD http_code=$http_code url=$HEALTH_URL"

# Alert once per outage — the `alerted` flag prevents repeat pages while
# the service is still down. Recovery clears the flag.
if (( count >= FAIL_THRESHOLD && alerted == 0 )); then
  echo 1 > "$ALERTED_FILE"
  msg="GarageRoute /api/health unhealthy: ${count} consecutive failures (last http_code=${http_code})"
  if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
    payload=$(printf '{"text":"%s","source":"garageroute-watchdog","count":%d,"http_code":"%s","url":"%s"}' \
      "$msg" "$count" "$http_code" "$HEALTH_URL")
    if curl -sS -X POST -H 'Content-Type: application/json' \
        --data "$payload" --max-time 5 "$ALERT_WEBHOOK_URL" >/dev/null 2>&1; then
      log "ALERT sent to webhook"
    else
      log "ALERT webhook POST FAILED"
    fi
  else
    log "ALERT (no ALERT_WEBHOOK_URL configured): $msg"
  fi
  exit 1
fi

exit 0
