#!/usr/bin/env bash
# scripts/deploy.sh — rsync to VPS, install + build + migrate + restart.
#
# Usage: ./scripts/deploy.sh
#
# What it does:
#   1. rsync the project (excluding heavy/secret dirs) to the VPS
#   2. Run npm ci on the VPS
#   3. Run prisma migrate deploy (safe for prod)
#   4. Run npm run build
#   5. pm2 reload garageroute (zero-downtime restart)
#
# Assumes:
#   - SSH key auth to root@74.208.64.42 is set up
#   - The VPS has node + pm2 + nginx + a `.env` file at /var/www/garageroute.com/.env
#   - The VPS project dir is /var/www/garageroute.com (where pm2 runs)
#
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@74.208.64.42}"
VPS_DIR="${VPS_DIR:-/var/www/garageroute.com}"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Syncing ${LOCAL_DIR} -> ${VPS_HOST}:${VPS_DIR}"
# Mirror — but preserve .env, .git, uploads, and build/cache dirs.
rsync -az --delete \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='uploads' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='.git' \
  --exclude='.mavis' \
  --exclude='ios' \
  --exclude='android' \
  --exclude='out' \
  "${LOCAL_DIR}/" "${VPS_HOST}:${VPS_DIR}/"

echo "==> Installing deps + applying migrations + building"
ssh "${VPS_HOST}" bash -s -- "${VPS_DIR}" <<'REMOTE'
set -euo pipefail
PROJECT="$1"
cd "${PROJECT}"
npm ci --no-audit --no-fund
npx prisma migrate deploy
npm run build
REMOTE

echo "==> Restarting PM2 process"
ssh "${VPS_HOST}" "pm2 reload garageroute || pm2 restart garageroute"

echo "==> Verifying"
sleep 2
ssh "${VPS_HOST}" "curl -sS -o /dev/null -w 'widget-config -> HTTP %{http_code} in %{time_total}s\\n' http://localhost:3001/api/bot/widget-config"
ssh "${VPS_HOST}" "curl -sS -o /dev/null -w 'home           -> HTTP %{http_code} in %{time_total}s\\n' http://localhost:3001/"

echo "Done."