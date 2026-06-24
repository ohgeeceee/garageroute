# GarageRoute — Production deploy guide

How GarageRoute gets from "builds clean" to "live in front of real users."
The app is deployed on a **single IONOS VPS** (Ubuntu 24.04, nginx + PM2)
via a `git push`-driven post-receive hook. There is no Vercel, no managed
platform — just one box.

> Status at the time of writing: build green, type-check green, lint clean
> (0 errors). `/api/health` returns 200 with `{ok:true, db:"up", uptime, version}`.

---

## 0. Pre-flight (5 min)

Before you touch the VPS:

```bash
cd garageroute
npm run build        # must exit 0
npm run lint         # 0 errors
npm run typecheck    # 0 errors
```

Don't deploy with new lint errors — fix first. The deploy hook will
build, but it won't lint.

---

## 1. First-time VPS setup (one-time, ~30 min)

The production server is `montanablotter.com` (74.208.64.42, Ubuntu 24.04,
`root` via `~/.ssh/config` alias). Once-per-project setup, scripted below.

### 1.1 Bare repo + work tree

The deploy model is a **bare git repo** that owns the **work tree** where
the app actually runs. Pushes to the bare repo trigger the post-receive
hook, which builds in-place and restarts PM2.

```bash
ssh montanablotter.com
mkdir -p /var/www/garageroute.com.git /var/www/garageroute.com
cd /var/www/garageroute.com.git
git init --bare
# post-receive hook ships in the repo at scripts/post-receive.sh.
# Install it BEFORE the first push — it does the npm install + build
# that turns an empty work tree into a working app.
git symbolic-ref HEAD refs/heads/main
cp /var/www/garageroute.com/scripts/post-receive.sh hooks/post-receive
chmod +x hooks/post-receive
```

### 1.2 Add the remote from your laptop

```bash
git remote add vps ssh://montanablotter.com/var/www/garageroute.com.git
git push vps main    # first push: builds the app, starts PM2
```

### 1.3 PM2

PM2 runs `next start -p 3001` for the `garageroute` process. The
post-receive hook manages the PM2 process for you (`pm2 restart` on
every push, `pm2 start` if missing, `pm2 save` on first deploy). Verify:

```bash
ssh montanablotter.com
pm2 list                       # garageroute online, port 3001
pm2 logs garageroute --lines 50
pm2 save                       # persist process list across reboots
```

`pm2-root.service` (systemd, already enabled) starts PM2 on boot. After
`pm2 save`, the process list survives a reboot.

### 1.4 nginx

`/etc/nginx/sites-enabled/garageroute.com` proxies `https://garageroute.com`
→ `http://localhost:3001`. The reference config lives at
`scripts/nginx-garageroute.conf` in the repo (security headers, www→apex
301, `proxy_hide_header X-Powered-By`). Certbot manages the TLS cert.

```bash
ssh montanablotter.com
sudo ln -sf /etc/nginx/sites-available/garageroute.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

State-subdomain nginx blocks (e.g. `indiana.garageroute.com`) live in the
same file — see § 9.

### 1.5 Env

The work tree has `/var/www/garageroute.com/.env` (not in git). On first
deploy, copy `.env.example` from the repo and fill in the prod values:

```bash
ssh montanablotter.com
cp /var/www/garageroute.com/.env.example /var/www/garageroute.com/.env
chmod 600 /var/www/garageroute.com/.env
$EDITOR /var/www/garageroute.com/.env
```

`pm2 restart garageroute --update-env` (the post-receive hook does this
automatically) re-reads the file on every deploy.

### 1.6 Database seed

After env is in place, apply migrations and seed:

```bash
ssh montanablotter.com
cd /var/www/garageroute.com
DATABASE_URL="file:/var/www/garageroute.com/prisma/prod.db" npx prisma migrate deploy
DATABASE_URL="file:/var/www/garageroute.com/prisma/prod.db" npm run db:seed
```

> **Don't skip the seed step.** `/states`, the home-page state picker,
> and the metadata alternates all assume the `State` table has rows.

---

## 2. Env — what each key does

`.env` is the source of truth. The post-receive hook restarts PM2 with
`--update-env` so any change to this file takes effect on the next push.

### 2.1 Stripe (live mode) — 10 min

1. Activate at https://dashboard.stripe.com/account (bank + business).
2. Copy **live** `sk_live_…` and **publishable** `pk_live_…`.
3. Webhook for: `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `charge.refunded`.
4. Webhook signing secret: `whsec_…` → `STRIPE_WEBHOOK_SECRET`.

Test locally with the Stripe CLI before going live:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
stripe trigger payment_intent.succeeded
```

### 2.2 Resend (transactional email) — 5 min

1. Sign up at https://resend.com.
2. Add & verify `garageroute.com`. Copy the auto-generated DNS records
   to your DNS provider.
3. Create an API key → `RESEND_API_KEY`.
4. Optional: inbound mail at https://resend.com/inbound gives you a
   Svix signing secret → `RESEND_WEBHOOK_SECRET`. Without it, the
   inbound endpoint accepts unsigned requests (fine in dev, not in prod).

### 2.3 Sentry — 5 min, optional

1. Create a project at https://sentry.io (Next.js template).
2. Copy the DSN → `SENTRY_DSN`.
3. `@sentry/nextjs` is already wired via `instrumentation.ts`. Source-map
   upload is **not** enabled — wire it later if you want readable stacks.

### 2.4 Admin login — 2 min

`/admin` is gated by `ADMIN_USERNAME` / `ADMIN_PASSWORD` (HTTP Basic +
session cookie). **Set strong values before launch, not after.** Changing
the env later invalidates all admin sessions — annoying but safe.

---

## 3. Database

The current prod DB is **SQLite** at
`/var/www/garageroute.com/prisma/prod.db`. Backed up automatically to
`/var/lib/garageroute/db-backups/` by a daily systemd timer (separate from
this app's deploy — lives on the host).

**Postgres is on the roadmap** for write concurrency. Until then, SQLite
is fine for a low-write discovery site (~tens of writes/minute at peak).
Watch the journal file size:

```bash
ssh montanablotter.com
ls -lh /var/www/garageroute.com/prisma/prod.db*
```

If `prod.db-journal` stays large for long, the DB is contended.

---

## 4. Deploy — `git push vps main`

```bash
git push vps main
```

The post-receive hook (`scripts/post-receive.sh`, installed at
`/var/www/garageroute.com.git/hooks/post-receive`) runs:

1. `git checkout` into the work tree (preserves `.env`, `prisma/prod.db`,
   `uploads/` — none of which are in git).
2. `npm ci` — install from the lockfile. Deterministic, no drift.
3. `npx prisma generate` — regenerate the Prisma client.
4. `npx prisma migrate deploy` — apply pending migrations.
5. **Schema-drift guard** (see § 5) — refuses to build if `schema.prisma`
   has drifted from the DB.
6. `npm run build` — production Next.js build.
7. `pm2 restart garageroute --update-env` — picks up the new build +
   any `.env` changes.

Total time: ~60s on a warm `node_modules`. The hook exits non-zero on
any failure — `git push` will report the error.

`node scripts/healthcheck.mjs` (in the repo) polls `/api/health` until
200 or timeout. The hook doesn't run it automatically — wire it in if
you want a smoke gate, or just curl from your laptop:

```bash
curl -sf https://garageroute.com/api/health | jq
# → { "ok": true, "db": "up", "uptime": 123, "version": "26fd2a8" }
```

---

## 5. The schema-drift guard

**Why it exists:** `prisma migrate deploy` checks migration history
("are there any unapplied migrations?") — it does **not** check that
the current `schema.prisma` matches the live DB schema. If you edit
`schema.prisma` and forget to run `prisma migrate dev`, the deploy
will succeed, the build will succeed, the server will start… and the
next query against the new column will crash with an obscure
`P2022: column does not exist` error. This already happened once on
this box (the 2026-06-24 incident).

**What the guard does:** between step 4 (migrate deploy) and step 5
(build), it runs `prisma migrate diff --from-url <db> --to-schema-datamodel
<schema>` with `--exit-code`. If drift is detected, the hook aborts
with a copy-pasteable recipe:

```
SCHEMA DRIFT: schema.prisma has changes not reflected in the database.
Inspect:  DATABASE_URL='…' npx prisma migrate diff \
            --from-url '…' --to-schema-datamodel prisma/schema.prisma --script
Generate: DATABASE_URL='…' npx prisma migrate dev --create-only --name fix_drift
Apply:    DATABASE_URL='…' npx prisma migrate deploy
Aborting deploy BEFORE build/restart — fix the drift and re-push.
```

**Workflow when the guard fires:**

1. Pull the same commit locally.
2. `npx prisma migrate dev --name fix_drift` — Prisma generates a
   migration, applies it to your dev DB, and you can review the SQL.
3. Commit the new migration file.
4. `git push vps main` — the guard re-checks, this time the diff is
   empty, the build proceeds.

---

## 6. Uptime monitor — two layers

You need **two** monitors, because they catch different failure modes:

| Layer | Tool | Catches |
|---|---|---|
| App-level (same VPS) | `garageroute-watchdog` systemd timer | App crashed, schema bug, DB corruption, nginx 502s |
| Host-level (external) | UptimeRobot / Better Stack | VPS is down, host unreachable, network partition, nginx not running |

The same-VPS watchdog cannot fire if the VPS itself is dead. The
external monitor cannot tell you *why* — only that something is wrong.

### 6.1 App-level watchdog (installed)

Lives at `/var/www/garageroute.com/scripts/watchdog.sh` (in the repo,
shipped via git). systemd unit + timer in `scripts/systemd/`. Install:

```bash
ssh montanablotter.com
bash /var/www/garageroute.com/scripts/install-watchdog.sh
```

That copies the unit files to `/etc/systemd/system/`, creates
`/etc/garageroute-watchdog.env`, and enables the timer (every 5 min).

**Behavior:** probes `https://garageroute.com/api/health` every 5 min.
Requires `HTTP 200` AND `body.ok == true`. After 3 consecutive failures
it fires ONE alert (webhook POST), then goes quiet until the service
recovers. Recovery resets the counter and logs.

**Alert channel:** set `ALERT_WEBHOOK_URL` in `/etc/garageroute-watchdog.env`
to a Slack / Discord incoming-webhook, a small Resend relay, or anything
that accepts a JSON POST. The payload is:

```json
{
  "text": "GarageRoute /api/health unhealthy: 3 consecutive failures (last http_code=502)",
  "source": "garageroute-watchdog",
  "count": 3,
  "http_code": "502",
  "url": "https://garageroute.com/api/health"
}
```

Leave it unset to log only (`/var/log/garageroute-watchdog.log`).

**Smoke test:**

```bash
ssh montanablotter.com
sudo /var/www/garageroute.com/scripts/watchdog.sh           # exits 0
sudo HEALTH_URL=http://localhost:3001/api/health \
     /var/www/garageroute.com/scripts/watchdog.sh           # local
sudo FAIL_THRESHOLD=1 ALERT_WEBHOOK_URL=http://127.0.0.1:9 \
     /var/www/garageroute.com/scripts/watchdog.sh           # force-fail
tail -f /var/log/garageroute-watchdog.log
systemctl list-timers garageroute-watchdog.timer
```

### 6.2 Host-level external monitor (do this once)

Free tier of any of these works. Pick one:

- **UptimeRobot** (https://uptimerobot.com) — 5-min checks, 50 monitors
  free, email + Slack + webhook alerts. Status code only, doesn't parse
  the body.
- **Better Stack** (https://betterstack.com) — 3-min checks, status page
  included, parses JSON body (so it can alert specifically when
  `db != "up"`).
- **Cronitor** (https://cronitor.io) — cron-style, also free.

**Setup (UptimeRobot example):**

1. Add monitor → HTTPS → `https://garageroute.com/api/health`.
2. Interval: 5 min. Timeout: 30s.
3. Alert contacts: email + (optional) phone SMS for 5+ failures.
4. Keyword monitoring (advanced): trigger on the literal string `"ok":true`
   in the response body — fires even if nginx returns 200 with a stale
   page.

Wire the public status page (UptimeRobot ships one) at
`https://stats.uptimerobot.com/…` to your `/status` page link in the
footer — operators trust external uptime pages more than a self-hosted
status string.

---

## 7. Post-deploy verification (5 min)

After every push, before you call it done:

```bash
PROD=https://garageroute.com

# 1. Health (db reachable? uptime sane? version matches the SHA you just pushed?)
curl -sf $PROD/api/health | jq

# 2. Status page
curl -sf $PROD/status | head

# 3. State network renders
curl -sf $PROD/states | grep -i "indiana"

# 4. Sales list returns JSON
curl -sf "$PROD/api/sales?limit=1" | head -c 200

# 5. Legal pages exist
for p in privacy terms cookies; do
  curl -sf $PROD/legal/$p > /dev/null && echo "  /legal/$p ✓" || echo "  /legal/$p ✗"
done
```

If any of these fail, the build or seed is broken — see Rollback
(§ Rollback) or fix forward.

---

## 8. Admin account (covered in § 2.4)

Pick `ADMIN_USERNAME` and `ADMIN_PASSWORD` **before** the first deploy,
not after. They're in `.env` on the VPS. After they're set, the only
way to rotate is to edit `.env` and push (the post-receive hook restarts
PM2 with `--update-env`).

---

## 9. State subdomains

`https://<state>.garageroute.com` (e.g. `indiana.garageroute.com`)
renders the home page with state-specific metadata. To enable a new
state:

1. Add the slug to `ENABLED_STATES` in `.env` (comma-separated).
2. Add an `A` (or `CNAME`) record for `<state>.garageroute.com` →
   `74.208.64.42`. Wildcard `*.garageroute.com` already covers any
   subdomain, so individual records are usually only needed for
   pre-provisioned certs. With Certbot's wildcard cert, no per-state
   record is required.
3. nginx: the per-state blocks live in
   `/etc/nginx/sites-enabled/garageroute.com`. The reference template
   is in `scripts/nginx-garageroute.conf` — duplicate the
   `server_name` line and the `location /` block per state, OR add
   a single `server_name *.garageroute.com` block if you want all
   subdomains to render the same app.
4. Verify: `curl -sI https://indiana.garageroute.com | grep x-state-slug`
   should return a header with the slug.

---

## 10. Stripe webhook end-to-end (10 min)

The reservation flow is the only paid path. Test it before launch:

1. From a logged-in seller, mark a high-value item "available for
   reservation."
2. From a separate browser, hit the public sale page → "Reserve."
3. Pay with Stripe test card `4242 4242 4242 4242` (dev) or a real
   card (prod).
4. Confirm:
   - Reservation row created in DB
     (`sqlite3 /var/www/garageroute.com/prisma/prod.db 'select * from Reservation order by id desc limit 1'`)
   - Item shows "reserved" in `/manage/[token]`
   - Stripe dashboard shows the payment
   - Webhook fired (Stripe dashboard → Developers → Webhooks → Logs)

---

## Going further (post-launch)

These are explicitly out of scope for the launch checklist but
documented here so they don't get lost.

### App Store / Play Store

1. Apple Developer account ($99/yr)
2. Google Play Console ($25 one-time)
3. Build the Capacitor app:
   ```bash
   npm run build:static          # NEXT_OUTPUT_EXPORT=1 next build
   npx cap sync
   npx cap open ios              # build & archive in Xcode
   npx cap open android          # build bundle in Android Studio
   ```
4. Submit. First review: 24–48h.

### Email template polish

`emails/saved-search.ts` is a stub. The lead-notify pipeline calls it
correctly, but the body is a single sentence. Replace with a real
React Email template before organic signups start landing.

### Postgres migration

SQLite is fine for tens of writes/minute. When you hit the
write-throughput wall (or want real cross-region read replicas), the
migration is:

1. Stand up a managed Postgres (Neon free tier is fine to start).
2. `npx prisma migrate dev` to regenerate the client + a baseline
   migration (the existing `prisma/migrations/` directory is
   SQLite-flavored — review for Postgres-incompatible types: no
   `Json` columns, no SQLite-specific defaults).
3. `pg_dump`-style data export from SQLite → import to Postgres
   (`prisma db seed` regenerates reference data; user-submitted
   data needs a custom script).
4. Update `DATABASE_URL` in `.env`, push, watch the schema-drift
   guard approve the new connection.

### Multi-region

The current architecture is single-VPS. A second region means two
PM2 instances, a load balancer, and a managed DB. Defer until you
have organic traffic justifying it.

---

## Rollback

`git push vps main` is your only deploy path — so rollback is `git
revert` (preferred) or `git reset --hard <good-sha>` (nuclear).

```bash
# Soft: make a new commit that undoes the bad one. Push it.
git revert <bad-sha>
git push vps main

# Nuclear: jump the work tree back. Only use if revert isn't
# possible (e.g. force-pushed branches, missing history).
ssh montanablotter.com
cd /var/www/garageroute.com
git checkout <good-sha> .         # updates tracked files
npm run build && pm2 restart garageroute --update-env
```

**Database:** down-migrations are footguns. If a migration shipped
something destructive, fix forward with a new migration that restores
the data, then ship. If you must roll back the schema, write a
one-off SQL script and run it via `sqlite3 prisma/prod.db < fix.sql`
— never edit `prisma/migrations/` after the fact.

**Backups:** the host runs a daily `prod.db` backup to
`/var/lib/garageroute/db-backups/`. To restore:

```bash
ssh montanablotter.com
pm2 stop garageroute
cp /var/lib/garageroute/db-backups/prod-YYYYMMDD.db /var/www/garageroute.com/prisma/prod.db
pm2 start garageroute
```

---

## Troubleshooting

**`/api/health` returns 200 but `db` is not "up"** — the DB file is
unreadable or the SQLite journal is stuck. Check
`pm2 logs garageroute | grep -i prisma`. Restart PM2; if it persists,
the schema-drift guard may have approved a build that still references
a column the live DB lacks — run the guard manually:

```bash
ssh montanablotter.com
cd /var/www/garageroute.com
DATABASE_URL="file:/var/www/garageroute.com/prisma/prod.db" \
  npx prisma migrate diff \
    --from-url "file:/var/www/garageroute.com/prisma/prod.db" \
    --to-schema-datamodel prisma/schema.prisma --script
```

**Push fails with "permission denied" on hooks** — the post-receive
hook lost its `+x` bit. `chmod +x
/var/www/garageroute.com.git/hooks/post-receive` on the server.

**Build fails on `next build` after a successful `npm ci`** — usually
a missing `.env` var. Check `pm2 logs garageroute` for the specific
variable name. Set it in `/var/www/garageroute.com/.env`, push again
(even an empty commit works) to trigger `--update-env`.

**`prisma migrate deploy` says "drift detected"** — that means the
schema was edited without a migration. See § 5.

**Postgres / different DB driver** — the project ships with
SQLite in dev for zero-setup onboarding. The deploy script doesn't
care which DB you use; only `DATABASE_URL` and the Prisma provider in
`schema.prisma` differ. If you swap providers, run `prisma migrate
dev --name init_postgres` locally to regenerate the baseline
migration, then `prisma migrate deploy` on the VPS.
