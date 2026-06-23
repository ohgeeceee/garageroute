# GarageRoute — Production deploy guide

This is the launch checklist for taking GarageRoute from "builds clean" to
"live in front of real users." It assumes you're deploying to **Vercel** as
the primary target, with notes for self-hosting at the bottom.

> Status at the time of writing: build green, type-check green, lint clean
> (0 errors, 70 warnings — all pre-existing noise from the prototype). The
> app boots on `npm run start` and serves all 56+ routes on port 3001.

---

## 0. Pre-flight (10 min)

Before you touch any platform:

```bash
# Confirm the build is clean.
cd garageroute
npm run build
npm run lint
npm run typecheck
```

All three should exit 0. If `lint` reports new errors, don't deploy —
fix first.

---

## 1. Database (10–15 min)

The current `.env` ships with SQLite. For production you need a real
Postgres.

**Recommended: Neon (free tier is fine to start).**

1. Sign up at https://neon.tech
2. Create a new project — pick a region close to your Vercel deploy
   region (`iad1` = US East).
3. Copy the **pooled** connection string. It looks like:
   ```
   postgresql://USER:PASS@ep-xxx.us-east-2.aws.neon.neondb/garageroute?sslmode=require
   ```
4. From your local terminal:
   ```bash
   export DATABASE_URL="postgresql://USER:PASS@ep-xxx.../garageroute?sslmode=require"
   npx prisma migrate deploy
   npm run db:seed
   ```
5. Verify with `npx prisma studio` — you should see the 8 sales and 5
   states from the seed.

> **Don't skip the seed step.** The state network page (`/states`),
> the home page state picker, and the metadata alternates all assume
> the `State` table has rows.

---

## 2. Stripe (10 min)

1. Activate your Stripe account at https://dashboard.stripe.com/account
   (you'll need to add a bank account + business details).
2. Grab the **live** secret key (starts with `sk_live_`) and the
   **live** publishable key (`pk_live_`).
3. Set up a webhook for these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the webhook signing secret (starts with `whsec_`).

> **Test the webhook locally first.** Use the Stripe CLI:
> ```bash
> stripe listen --forward-to localhost:3001/api/stripe/webhook
> ```
> Trigger test events with `stripe trigger payment_intent.succeeded`.
> Confirm the reservation flow updates the DB.

---

## 3. Resend (5 min)

1. Sign up at https://resend.com
2. Add & verify the `garageroute.com` domain (DNS records are
   auto-generated — copy them to your DNS provider).
3. Create an API key.
4. Optional: set up inbound mail at https://resend.com/inbound
   (gives you a Svix signing secret — paste it into
   `RESEND_WEBHOOK_SECRET`).

After this, password resets, alerts, and bot replies all deliver.

---

## 4. Sentry (5 min, optional but recommended)

1. Create a project at https://sentry.io (Next.js template).
2. Grab the DSN.
3. The Sentry SDK is already wired (`@sentry/nextjs` + `instrumentation.ts`).
   All you need is the DSN env var.

Source-map upload is **not** enabled by default — wire it later if
you want readable stack traces (see the `@sentry/nextjs` docs).

---

## 5. Vercel deploy (5 min)

1. Push the repo to GitHub.
2. In Vercel, "Add New Project" → import the repo.
3. **Build settings** — Vercel should auto-detect Next.js. Override
   the build command to:
   ```
   prisma generate && next build
   ```
   (Vercel already runs `prisma generate` via `postinstall`, but
   pinning it makes failures easier to debug.)
4. **Environment variables** — paste every value from `.env.example`
   that you filled in. Don't paste the file itself; enter each
   variable in the UI.
5. **Custom domain** — Settings → Domains → add `garageroute.com` and
   `*.garageroute.com` (state subdomains). Vercel auto-provisions
   the cert.
6. Click **Deploy**. First build will take ~2 min.

After the deploy succeeds, the cron jobs (`/api/cron/expire-sales`,
`/api/cron/ingest`) are scheduled automatically from `vercel.json`.

---

## 6. Post-deploy verification (10 min)

Once Vercel gives you a green URL:

```bash
# Replace with your real URL.
export PROD=https://garageroute.com

# 1. Health check
curl $PROD/api/health
# Expect: { "ok": true, "db": "up", "uptime": <n>, "version": "<sha>" }

# 2. Status page
curl $PROD/status | head

# 3. State network renders
curl $PROD/states | grep -i "indiana"

# 4. Sales list returns JSON
curl "$PROD/api/sales?limit=1" | head -c 200

# 5. Legal pages exist
for p in privacy terms cookies; do
  curl -sf $PROD/legal/$p > /dev/null && echo "  /legal/$p ✓" || echo "  /legal/$p ✗"
done
```

If any of those fail, the build or seed is broken — roll back, fix,
redeploy.

---

## 7. Wire the uptime monitor (5 min)

You now have `/api/health` returning JSON. Point an uptime monitor
at it:

- **BetterUptime** (free tier): add an HTTPS check on
  `/api/health`, expect status 200. Set the check interval to 60s.
- **Cronitor** (free tier): same.
- **UptimeRobot** (free tier): same, but it doesn't parse the body
  — check the status code only.

Wire alerts to your phone + email. Set the warning threshold to
"3 failures in a row" so a single false-positive doesn't wake you up.

---

## 8. Admin account (2 min)

The `/admin` panel is gated by `ADMIN_USERNAME` / `ADMIN_PASSWORD`
(via HTTP Basic + a session cookie). Pick strong values **before**
the deploy, not after.

If you change the env after launch, the cookie invalidates and
every admin session re-prompts for Basic auth. Annoying but safe.

---

## 9. State subdomain verification (5 min)

Visit `https://indiana.garageroute.com` (assuming you seeded Indiana
as `live`). You should see:

- The home page rendered with Indiana-specific metadata
- A `<title>` containing "Indiana"
- The x-state-slug header in dev tools

If the subdomain doesn't resolve, check:

- DNS: `*.garageroute.com` CNAME to `cname.vercel-dns.com`
- `ENABLED_STATES` includes `indiana`

---

## 10. Stripe webhook end-to-end (10 min)

The reservation flow is the only paid path. Test it before launch:

1. From a logged-in seller account, mark a high-value item as
   "available for reservation."
2. From a separate browser, hit the public sale page and click
   "Reserve."
3. Pay with Stripe test card `4242 4242 4242 4242` (in dev) or a
   real card (in prod).
4. Confirm:
   - Reservation row is created in DB
   - Item shows as "reserved" in `/manage/[token]`
   - Stripe dashboard shows the payment
   - Webhook fires (check the Stripe CLI or dashboard)

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
4. Submit to stores. Review typically takes 24–48h on first submit.

### Email template polish

The `emails/saved-search.ts` template is a stub. The lead-notify
pipeline now calls it correctly (per the build fix), but the body
is a single sentence. Replace with a real React Email template
before you start getting organic signups.

### Static-export + mobile

The Capacitor `webDir: 'out'` is set up. To produce a self-contained
APK that doesn't need the live URL:

```bash
NEXT_OUTPUT_EXPORT=1 npm run build     # produces ./out/
npx cap sync                            # copies ./out/ into iOS / Android projects
```

Don't set `NEXT_OUTPUT_EXPORT=1` for the server deploy — Vercel
serves the Node.js build and uses ISR for the city/state pages.

---

## Rollback

If a deploy goes sideways, Vercel keeps the previous build live and
you can roll back from the dashboard in two clicks. The DB is the
only state that persists across deploys — if you ran a bad
migration, fix forward with a new migration rather than rolling back
the schema (down-migrations are footguns).
