#!/bin/bash
# Install the GarageRoute watchdog systemd unit + timer.
#
# Run once on the VPS as root:
#
#   bash scripts/install-watchdog.sh
#
# Idempotent: re-running updates the unit files in place. To change the
# poll interval, edit scripts/systemd/garageroute-watchdog.timer in the
# repo, re-run this script, and `systemctl daemon-reload` is automatic.
#
# Optional: write the alert channel config to /etc/garageroute-watchdog.env
# before running. Two options, pick at most one:
#
#   ALERT_WEBHOOK_URL=https://hooks.slack.com/services/T000/B000/XXX
#   ALERT_EMAIL_TO=founder@example.com
#
# If both are set, the webhook wins and email is a fallback. If neither
# is set, alerts log only. The Resend email fallback reuses
# RESEND_API_KEY + RESEND_FROM_EMAIL from /var/www/garageroute.com/.env
# (the systemd unit loads both env files).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
UNIT_DIR=/etc/systemd/system
ENV_FILE=/etc/garageroute-watchdog.env

install -m 0644 "$SCRIPT_DIR/systemd/garageroute-watchdog.service" "$UNIT_DIR/garageroute-watchdog.service"
install -m 0644 "$SCRIPT_DIR/systemd/garageroute-watchdog.timer"   "$UNIT_DIR/garageroute-watchdog.timer"
chmod +x "$REPO_DIR/scripts/watchdog.sh"

# Create the env file on first run, leave it alone on subsequent runs.
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
# GarageRoute watchdog config.
#
# Pick ONE alert channel (or leave both commented for log-only):
#
#   # Webhook — Slack/Discord/anything that accepts JSON POST.
#   ALERT_WEBHOOK_URL=
#
#   # Email — uses Resend (reuses RESEND_API_KEY from /var/www/garageroute.com/.env).
#   ALERT_EMAIL_TO=
#
# If both are set, webhook wins and email is a fallback.
HEALTH_URL=https://garageroute.com/api/health
FAIL_THRESHOLD=3
EOF
  chmod 0600 "$ENV_FILE"
  echo "created $ENV_FILE (edit to set ALERT_WEBHOOK_URL or ALERT_EMAIL_TO)"
fi

mkdir -p /var/lib/garageroute-watchdog
touch    /var/log/garageroute-watchdog.log

systemctl daemon-reload
# Re-enable + restart so any change to the unit files takes effect.
systemctl enable --now garageroute-watchdog.timer
systemctl restart    garageroute-watchdog.timer 2>/dev/null || true

echo
echo "watchdog installed and running. Status:"
systemctl list-timers garageroute-watchdog.timer --no-pager
echo
echo "manual smoke test:"
echo "  sudo -u root /var/www/garageroute.com/scripts/watchdog.sh"
echo "  tail -f /var/log/garageroute-watchdog.log"
