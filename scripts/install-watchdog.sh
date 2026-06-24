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
# Optional: write the alert webhook to /etc/garageroute-watchdog.env
# before running. Format:
#
#   ALERT_WEBHOOK_URL=https://hooks.slack.com/services/T000/B000/XXX
#
# Leave it unset to log alerts only (no page).

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
# GarageRoute watchdog config. Leave ALERT_WEBHOOK_URL empty to log
# only (no external alert). Point it at Slack / Discord / Resend /
# anything that accepts a JSON POST.
# ALERT_WEBHOOK_URL=
# HEALTH_URL=https://garageroute.com/api/health
# FAIL_THRESHOLD=3
EOF
  chmod 0600 "$ENV_FILE"
  echo "created $ENV_FILE (edit to set ALERT_WEBHOOK_URL, then re-run)"
fi

mkdir -p /var/lib/garageroute-watchdog
touch    /var/log/garageroute-watchdog.log

systemctl daemon-reload
systemctl enable --now garageroute-watchdog.timer

echo
echo "watchdog installed and running. Status:"
systemctl list-timers garageroute-watchdog.timer --no-pager
echo
echo "manual smoke test:"
echo "  sudo -u root /var/www/garageroute.com/scripts/watchdog.sh"
echo "  tail -f /var/log/garageroute-watchdog.log"
