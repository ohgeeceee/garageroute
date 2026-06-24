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
#   ALERT_WEBHOOK_URL  (empty = log only unless email fallback below applies)
#
# Email fallback (no webhook required). The systemd unit loads both
# /etc/garageroute-watchdog.env AND /var/www/garageroute.com/.env, so
# RESEND_API_KEY + RESEND_FROM_EMAIL are inherited automatically. Set
# ALERT_EMAIL_TO in the watchdog env to enable:
#   ALERT_EMAIL_TO     recipient@example.com
# Falls through to log-only if any of these three are missing.
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
  alerted_via=""
  if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
    payload=$(printf '{"text":"%s","source":"garageroute-watchdog","count":%d,"http_code":"%s","url":"%s"}' \
      "$msg" "$count" "$http_code" "$HEALTH_URL")
    if curl -sS -X POST -H 'Content-Type: application/json' \
        --data "$payload" --max-time 5 "$ALERT_WEBHOOK_URL" >/dev/null 2>&1; then
      log "ALERT sent to webhook"
      alerted_via="webhook"
    else
      log "ALERT webhook POST FAILED"
    fi
  fi
  # Email fallback: webhook unset OR webhook failed, and Resend is wired.
  if [[ -z "$alerted_via" && -n "${RESEND_API_KEY:-}" && -n "${RESEND_FROM_EMAIL:-}" && -n "${ALERT_EMAIL_TO:-}" ]] && command -v jq >/dev/null 2>&1; then
    ts=$(date -u +%FT%TZ)
    host=$(hostname -f 2>/dev/null || hostname)
    subject="[GarageRoute] /api/health DOWN - ${count} consecutive failures"
    text_body="${msg}
URL: ${HEALTH_URL}
Time: ${ts}
Host: ${host}

Next steps:
  ssh montanablotter.com 'journalctl -u garageroute-watchdog -n 30; tail -50 /var/log/garageroute-watchdog.log'
  ssh montanablotter.com 'pm2 status garageroute; pm2 logs garageroute --lines 50 --nostream'
"
    html_body="<p><strong>GarageRoute /api/health is unhealthy.</strong></p>
<p>${count} consecutive failures (last HTTP code: <code>${http_code}</code>)<br>
URL: <code>${HEALTH_URL}</code><br>
Time: ${ts}<br>
Host: <code>${host}</code></p>
<h4>Next steps</h4>
<pre>ssh montanablotter.com 'journalctl -u garageroute-watchdog -n 30; tail -50 /var/log/garageroute-watchdog.log'
ssh montanablotter.com 'pm2 status garageroute; pm2 logs garageroute --lines 50 --nostream'</pre>
<p style=\"color:#888;font-size:12px\">alerted via garageroute-watchdog (resend email)</p>"
    payload_file=$(mktemp)
    if jq -nc \
        --arg from "$RESEND_FROM_EMAIL" \
        --arg to "$ALERT_EMAIL_TO" \
        --arg subject "$subject" \
        --arg text "$text_body" \
        --arg html "$html_body" \
        '{from:$from, to:[$to], subject:$subject, text:$text, html:$html}' \
        > "$payload_file" 2>/dev/null \
      && curl -sS -X POST \
          -H "Authorization: Bearer ${RESEND_API_KEY}" \
          -H 'Content-Type: application/json' \
          --data @"$payload_file" --max-time 10 \
          https://api.resend.com/emails >/dev/null 2>&1; then
      log "ALERT sent via Resend to $ALERT_EMAIL_TO"
      alerted_via="resend"
    else
      log "ALERT Resend POST FAILED"
    fi
    rm -f "$payload_file"
  fi
  if [[ -z "$alerted_via" ]]; then
    log "ALERT (no channel succeeded): $msg"
  fi
  exit 1
fi

exit 0
