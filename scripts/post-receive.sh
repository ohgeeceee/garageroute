#!/bin/bash
# GarageRoute post-receive hook.
# Triggered by `git push vps main`. Builds the new commit in-place and
# restarts the PM2 process so nginx (which proxies to :3001) serves the
# new code without manual steps.
#
# Pipeline:
#   1. Checkout files into the work tree (preserves .env, prod.db, uploads/).
#   2. npm ci — install deps from lockfile (deterministic, no drift).
#   3. prisma generate + migrate deploy — client regen, run pending migrations.
#   4. SCHEMA-DRIFT GUARD — migrate deploy only checks migration history, not
#      schema↔DB parity. If someone edited schema.prisma without running
#      `prisma migrate dev`, this catches it BEFORE the live server hits an
#      obscure Prisma error under load. Aborts with instructions otherwise.
#   5. next build — production build.
#   6. pm2 restart — picks up the new .next/ build.

set -euo pipefail

GIT_DIR=/var/www/garageroute.com.git
WORK_TREE=/var/www/garageroute.com
BRANCH=main
# Absolute path: avoids CWD-relative surprises from the Prisma CLI
# (which resolves file:./ paths relative to schema.prisma).
DATABASE_URL="file:/var/www/garageroute.com/prisma/prod.db"

echo "[post-receive] $(date -u +%FT%TZ) deploying ${BRANCH}"

# 1. Update tracked files in the work tree.
git --git-dir="$GIT_DIR" --work-tree="$WORK_TREE" checkout -f "$BRANCH"
cd "$WORK_TREE"

# 2. Install deps.
echo "[post-receive] npm ci"
npm ci --no-audit --no-fund

# 3. Prisma client + migrations.
echo "[post-receive] prisma generate + migrate deploy"
npx prisma generate >/dev/null
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

# 4. Schema-drift guard.
echo "[post-receive] schema drift check"
if ! DATABASE_URL="$DATABASE_URL" npx prisma migrate diff \
     --from-url "$DATABASE_URL" \
     --to-schema-datamodel prisma/schema.prisma \
     --script --exit-code > /dev/null 2>&1; then
  echo ""
  echo "  SCHEMA DRIFT: schema.prisma has changes not reflected in the database."
  echo "  Inspect:  DATABASE_URL='$DATABASE_URL' npx prisma migrate diff \\"
  echo "              --from-url '$DATABASE_URL' --to-schema-datamodel prisma/schema.prisma --script"
  echo "  Generate: DATABASE_URL='$DATABASE_URL' npx prisma migrate dev --create-only --name fix_drift"
  echo "  Apply:    DATABASE_URL='$DATABASE_URL' npx prisma migrate deploy"
  echo ""
  echo "  Aborting deploy BEFORE build/restart — fix the drift and re-push."
  exit 1
fi

# 5. Build.
echo "[post-receive] next build"
npm run build

# 6. Restart PM2. Use --update-env so any changes to /var/www/garageroute.com/.env take effect.
echo "[post-receive] pm2 restart"
if pm2 describe garageroute >/dev/null 2>&1; then
  pm2 restart garageroute --update-env
else
  pm2 start npm --name garageroute --cwd "$WORK_TREE" -- start
  pm2 save
fi

echo "[post-receive] done — $(date -u +%FT%TZ)"