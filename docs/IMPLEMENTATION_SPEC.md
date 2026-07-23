# GarageRoute — Implementation Spec

A pre-build spec: what the product is, who it serves, what "done" looks like, and the key decisions/defaults for each layer of the build. Reflects the architecture already in this repo, written as the spec that would justify those choices.

## 1. What it does

GarageRoute is a discovery and route-planning tool for garage/yard sales. Two jobs:

- **Buyers**: search sales by location, item keyword, category, or theme; preview item-level inventory (photos, price, condition) *before* leaving the house; build a multi-stop driving route across a Saturday's worth of sales with map + ETA.
- **Sellers**: post a sale in minutes with no signup, get a private management link (`sellerToken` URL) to mark items sold, manage a virtual queue at the door, answer buyer messages, take reservation deposits, and request a donation pickup for leftovers. An optional full-account path also exists (see §6.3).

It is a thin, content-plus-logistics layer over an inherently physical, time-boxed event (a sale that exists for a few hours, a few days a year) — not a general marketplace.

## 2. Who it's for

- **Bargain-hunting buyers** who currently tab-hop between Facebook Marketplace posts and a paper map, and want one filtered list + one route.
- **Casual/one-off sellers** (moving, decluttering, estate cleanup of a single household) who want a free listing and a simple "front desk" for the day, with zero account setup — friction is the enemy of a seller who runs this once a year.
- **Regional buyer communities**, via the state-network rollout (Phase 11): each state gets its own subdomain so local search/SEO and word-of-mouth work the way "indianapolis garage sales" search behavior already works today.

## 3. Who it's NOT for

- **Recurring/professional resellers** who need real inventory management, multi-channel sync, or shipping — this is not a Shopify competitor.
- **Estate-sale or consignment companies** needing staff accounts, role-based permissions, or audit trails.
- **Anyone needing checkout/shipping** — reservations are a deposit-to-hold mechanism for in-person pickup, not e-commerce.

## 4. What success looks like

- A seller can go from "I want to post a sale" to a live, shareable listing in under ~3 minutes, no account.
- A buyer can filter sales, add 4-5 to a route, and get a sane road-following itinerary without leaving the browser tab.
- State subdomains can be added without forking the codebase (though this also requires proxy config — see §6.8).
- The app stays usefully fast and crawlable as a mostly-static/SSR site even before any "real" backend investment lands.
- Outages are caught before users report them (already built: `/api/health`, systemd watchdog, GitHub Actions uptime check).

## 5. Out of scope (for this spec / current phase)

- Real-time push (WebSocket) updates — UI is structured to support it later, but polling/refresh is the current mechanism.
- Image upload pipeline — photos are placeholder URLs (`picsum.photos`) today. Note: a `PhotoUploader` component and `app/account/sales/new/` page already exist but the signing handler (`/api/uploads/sign`) has not been implemented; that broken flow needs to either be completed or removed.
- Native app store distribution — Capacitor is scaffolded; see §6.9 for current state.
- General e-commerce (cart, shipping, multi-item checkout) beyond single-item reservation deposits.
- Enterprise/multi-user seller accounts.

## 6. Implementation walkthrough — decisions and defaults

### 6.1 Core data model (Sale / Item / listing lifecycle)
- **Decision**: relational rows per sale and per item, vs. one denormalized JSON blob per sale.
- **Default chosen**: Prisma models (`Sale`, `Item`, `Alert`, `Queue`, `Message`, `Reservation`) with `photos` stored as a JSON string column rather than a join table.
- **Why**: item-level querying (search "inside" a sale) needs real rows; photos are an ordered, sale-owned list with no independent lifecycle, so a JSON string is cheaper than a join table and avoids N+1s on list views.
- **Alternative considered**: fully normalized `Photo` table — rejected for now as unnecessary until photos need their own metadata (ordering UI, moderation flags, etc.).

### 6.2 Database engine
- **Decision**: SQLite vs. Postgres/MySQL from day one.
- **Default chosen**: SQLite file DB via Prisma, swappable later since Prisma abstracts the dialect.
- **Why**: zero infra for a prototype/early-traffic product; one file, one VPS, no managed-DB bill.
- **Risk to flag**: SQLite write concurrency will become the ceiling before app logic does. The trigger to migrate to Postgres is "concurrent seller-dashboard writes during a Saturday morning producing lock contention," not a fixed traffic number.

### 6.3 Seller access control
- **Decision**: full auth system vs. capability-URL (bearer token in the path) vs. both.
- **Current state**: two parallel paths exist in the codebase:
  1. **Token path** (primary for casual sellers): `sellerToken` UUID in `/manage/[token]`, no login. Matches the "post once, manage for a weekend, never return" usage pattern.
  2. **Account path**: `User` / `Session` / `UserVerification` models in `prisma/schema.prisma`, `lib/auth-user.ts`, and `app/api/account/sales/route.ts` implement a full session-auth flow for sellers who want a persistent identity.
- **Known security gap (fixed)**: `GET /api/sales` and `GET /api/sales/[id]` were previously serializing the full Prisma `Sale` row including `sellerToken` to public callers. This has been corrected — those endpoints now strip `sellerToken` (and `sellerEmail`) before responding. The server-rendered "Manage inventory" link on the sale detail page fetches the token directly from Prisma (server component, not exposed in the public JSON).
- **Defaults to enforce**: token must be treated as a secret (HTTPS only, not logged, not embeddable in shareable buyer-facing links); no password-reset-equivalent exists for the token path, so losing the link means losing the sale — state this to sellers at creation time.

### 6.4 Discovery & filtering
- **Decision**: client-side filter of a fetched list vs. server-side query params.
- **Default chosen**: server-side filtering via query params (`/api/sales?query=&type=&category=&verifiedOnly=`), so the list scales past "small enough to ship to the client."
- **Why**: once the state network multiplies the row count, shipping every sale to the client to filter doesn't hold up; server-side filtering also sets up future full-text search without a client rewrite.

### 6.5 Route planning
- **Decision**: straight-line distance heuristic vs. real road-following routing.
- **Default chosen**: public OSRM demo server for driving directions (polyline, distance, ETA), with Leaflet/OSM for the map tiles.
- **Why**: free, no API key, "good enough" for a prototype's core differentiator (the route, not just a pin map).
- **Risk to flag**: the OSRM *demo* server has no uptime SLA and rate-limits — treat "swap to a self-hosted OSRM or a paid routing API" as the first thing to revisit if route requests start failing under load.

### 6.6 Geocoding
- **Decision**: geocode on sale creation vs. on every read.
- **Default chosen**: geocode once at `POST /api/sales` time via Nominatim, store lat/lng on the row.
- **Why**: Nominatim's usage policy expects low-volume, cached use — geocoding once per address (not per page view) is the only sustainable pattern, and it's also just faster for readers.

### 6.7 Payments / reservations
- **Decision**: require a real payment processor from day one vs. mock-mode fallback.
- **Default chosen**: Stripe if `STRIPE_SECRET_KEY` is set, otherwise a fake `paymentIntentId` in mock mode.
- **Known incomplete flow**: when Stripe is configured, `POST /api/reservations` creates a PaymentIntent and returns its `clientSecret`, but `ReservationForm` does not call Stripe.js `confirmPayment` with that secret — so no funds are actually collected in the live-Stripe path. The client-confirmation step is missing and must be implemented before this can be described as "taking deposits."

### 6.8 Multi-state rollout (Phase 11)
- **Decision**: one app per state vs. one app, state-aware routing.
- **Default chosen**: single codebase; a `State` table (slug, status, bbox, etc.) drives routing — `status=live` states get a cross-domain `<a>` to `{slug}.garageroute.com`, `status=preview|seeding` states get a coming-soon page at `/states/{slug}` on the main domain.
- **Why**: avoids N codebases for N states. Cross-domain links use plain `<a>`, not `next/link`, because these are genuinely different origins/deployments.
- **Not purely data-driven**: adding a live state also requires updating `proxy.ts` — the `STATE_NAMES` object and `ENABLED_STATES` env var are currently hard-coded there, not read from the database. A newly inserted `State` row plus DNS will still return a 404 until `proxy.ts` and the env var are updated (or the proxy is refactored to be data-driven).
- **Decision still open**: `saleCount`/`sellerCount` on `StateCard` are hardcoded placeholders today. Default for closing this: replace with a Prisma `count()` aggregation scoped by state bounding box, computed at request time for low-traffic states.
- **Alert reuse**: state-launch signups reuse the existing `Alert` table via `category = "state-launch:{slug}"` rather than a new table.

### 6.9 Mobile wrapper
- **Decision**: ship a Capacitor-wrapped native app now vs. defer until web is validated.
- **Current state**: Capacitor config and platform folders exist (`ios/`, `android/`). Static export is already available — `next.config.ts` enables `output: "export"` when `NEXT_OUTPUT_EXPORT=1` is set, and `npm run build:static` exposes that path. The Capacitor config currently points to a live `server.url` rather than the static `out/` directory; switching to native-bundled assets requires changing `capacitor.config.ts` to use the static build output.
- **Why deferred**: keeps the option open without committing to maintaining two build pipelines before the web product's core loop is proven.

### 6.10 Deployment & reliability
- **Decision**: managed platform (e.g., Vercel) vs. self-managed VPS.
- **Default chosen** (per recent commits): VPS deploy with a `systemd`-managed process, a same-VPS `/api/health` watchdog, and an external GitHub Actions + UptimeRobot check so an outage is caught even if the VPS itself can't self-report.
- **Why**: external monitoring exists specifically because a watchdog running *on* the box that died can't tell anyone it died.

### 6.11 Quality gates
- **Decision**: how much testing infra before further features land.
- **Default chosen**: ESLint (`next/core-web-vitals` + `typescript`) as the baseline gate, Playwright smoke tests, and Sentry for runtime error visibility — added during the "production hardening" pass rather than from project start.
- **Current Playwright coverage**: `tests/e2e/smoke.spec.ts` covers page availability (home, `/api/health`, `/api/sales`) and login rate-limiting — not critical product flows (search, post, route-building). This provides deploy-breakage detection, not regression protection for product features.
- **Why**: for a prototype, shipping the core loop fast matters more than test coverage; hardening was sequenced in once the feature set stabilized.
