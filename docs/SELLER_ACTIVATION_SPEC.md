# Seller Activation — Implementation Spec

A focused spec for the next phase: getting sellers to actually post. Companion to `docs/IMPLEMENTATION_SPEC.md` (overall product spec) — this one is scoped to a single growth problem, derived from an interview rather than codebase inference.

## Problem

We can't get sellers to post. Paid ads drove traffic without converting to posted sales, which points at the posting *experience* or *value proposition*, not just an awareness/channel problem. We don't yet have funnel data to confirm exactly where people drop off.

## Audience

- **For**: the frequent declutterer/flipper — someone who runs a sale every season or few months. They have a recurring need, making them the highest-leverage user to activate, since repeat usage compounds in a way one-time signups don't.
- **Not for (this phase)**: one-time casual sellers (existing tokenless flow stays untouched), buyers (no buyer-facing changes), estate-sale/multi-vendor organizers (different needs — branding, multi-seller management — deferred).

## Context: existing auth system

The codebase already has a `User` / `Session` / `UserVerification` schema and `lib/auth-user.ts`. This spec intentionally does not use it for the activation feature — frequent declutterers are the one segment where account friction matters most. The decisions below use email-plus-token identity to stay login-free, while the full account path remains available for sellers who opt in.

## Success metric

Target number of new sales posted per week, measured against a funnel baseline established as part of this work. (Open item: the specific target number — set once the baseline exists, so "did it work" isn't just vibes.)

## Constraint

No new infra/cost commitments. Everything below extends the existing Next.js/Prisma/SQLite stack — no third-party analytics or paid services.

## Key decisions

### 1. Instrument before assuming
Add a first-party funnel-events log so we see the real drop-off point instead of guessing.

- **Default**: a minimal table (step enum: `viewed_post` / `started_form` / `submitted`; anonymous `correlationId`; timestamp). Coarse steps only — the goal is "where do they drop," not session replay.
- **Important**: the `/post` page view event must be committed by the client, not captured server-side at render time. Next.js `<Link>` prefetching and crawler requests will fire server-side renders before a human ever opens the form, materially inflating the top-of-funnel baseline. The pattern: page loads → JS runs → client POSTs `{step: "viewed_post", correlationId}` to the API; the same `correlationId` (stored in `sessionStorage`) is included on the `started_form` and `submitted` events so the three steps can be joined per session.

### 2. Seller identity = email, but it's not a login
Add an indexed `sellerEmail` column on `Sale`.

- **Default**: a plain column, not a new `Seller` table. Promote to a real table only when we need seller-level fields (display name, follower count) beyond grouping by email.
- **Why**: email is a low-friction single field to capture at post time and lets us measure repeat-posting rate without building an account system.

### 3. "Clone your last sale" is the core lever
A frequent seller's biggest friction is re-entering inventory every time. Add a one-click "run this sale again" action that pre-fills a new post from a previous one (items, photos, description), letting them edit dates/address rather than starting from zero.

### 4. Security default: clone access is capability-based, not email-based
The existing model gates seller access by secret `sellerToken`, not login.

- **Default**: "clone" is driven by sellerTokens already held in that browser (localStorage), *not* by looking up "last sale for this email."
- **Why**: an email lookup would let anyone who merely knows a seller's address pull up their private inventory — a real access-control leak. Email stays purely for analytics/repeat-rate tracking and is never used as an access key.
- **Implementation gap to close first**: no code currently writes `sellerToken` to `localStorage`. The post-creation flow in `app/post/PostPageClient.tsx` redirects to the public sale page immediately after submit, discarding the token in the browser. Before "clone" can work, the post-creation handler must persist the token to `localStorage` (e.g., a JSON array of `{id, sellerToken}` pairs) before navigating away. This is the prerequisite step.

### 5. Paid ads: pause, don't repeat
Ads got traffic without conversion — the working hypothesis is the bottleneck is the product/flow, not the channel.

- **Default**: hold off on further ad spend until funnel data either confirms or rules this out.

## Explicitly out of scope this phase

- Buyer-facing "follow this seller" mechanic
- Full seller accounts/login
- Estate-sale or multi-vendor organizer tooling
- Changes to the casual one-time-seller flow

## Open items

- Specific weekly-posts target number (set after the funnel baseline exists).
- Whether/when email gets promoted to a real `Seller` table.
- Whether `sellerToken` written to `localStorage` should carry an expiry (e.g., 90 days) to limit indefinite accumulation.
