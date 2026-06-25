# Seller Activation — Implementation Spec

A focused spec for the next phase: getting sellers to actually post. Companion to `docs/IMPLEMENTATION_SPEC.md` (overall product spec) — this one is scoped to a single growth problem, derived from an interview rather than codebase inference.

## Problem

We can't get sellers to post. Paid ads drove traffic without converting to posted sales, which points at the posting *experience* or *value proposition*, not just an awareness/channel problem. We don't yet have funnel data to confirm exactly where people drop off.

## Audience

- **For**: the frequent declutterer/flipper — someone who runs a sale every season or few months. They have a recurring need, making them the highest-leverage user to activate, since repeat usage compounds in a way one-time signups don't.
- **Not for (this phase)**: one-time casual sellers (existing tokenless flow stays untouched), buyers (no buyer-facing changes), estate-sale/multi-vendor organizers (different needs — branding, multi-seller management — deferred).

## Success metric

Target number of new sales posted per week, measured against a funnel baseline established as part of this work. (Open item: the specific target number — set once the baseline exists, so "did it work" isn't just vibes.)

## Constraint

No new infra/cost commitments. Everything below extends the existing Next.js/Prisma/SQLite stack — no third-party analytics or paid services.

## Key decisions

### 1. Instrument before assuming
Add a first-party funnel-events log — a minimal table logged server-side at `/post` view → form start → submit — so we see the real drop-off point instead of guessing. This also becomes the baseline for the success metric.

- **Default**: coarse steps only (viewed → started → submitted), not field-level tracking. The goal is "where do they drop," not session replay.

### 2. Seller identity = email, but it's not a login
Add an indexed `sellerEmail` column on `Sale`.

- **Default**: a plain column, not a new `Seller` table. A separate table is premature until we need seller-level fields (display name, follower count) beyond simple grouping by email. Promote to a real table only when that need shows up.
- **Why**: email is a low-friction single field to capture at post time and lets us measure repeat-posting rate without building any account system.

### 3. "Clone your last sale" is the core lever
A frequent seller's biggest friction is re-entering inventory every time. Add a one-click "run this sale again" action that pre-fills a new post from a previous one (items, photos, description), letting them just edit dates/address.

### 4. Security default: clone access is capability-based, not email-based
The existing model gates seller access by secret `sellerToken`, not login (per `AGENTS.md`: "seller access is gated by secret sellerToken URLs... treat these as secrets").

- **Default**: "clone" is driven by sellerTokens already held in that browser (localStorage), *not* by looking up "last sale for this email."
- **Why**: looking up "last sale for this email" would let anyone who merely knows a seller's email address pull up that seller's private inventory — a real access-control leak. Email stays purely for analytics/repeat-rate tracking and is never used as an access key.

### 5. Paid ads: pause, don't repeat
Ads got traffic without conversion — the working hypothesis is the bottleneck is the product/flow, not the channel.

- **Default**: hold off on further ad spend until funnel data either confirms or rules this out. Don't recommend a new acquisition channel yet.

## Explicitly out of scope this phase

- Buyer-facing "follow this seller" mechanic
- Full seller accounts/login
- Estate-sale or multi-vendor organizer tooling
- Changes to the casual one-time-seller flow

## Open items

- Specific weekly-posts target number (set after the funnel baseline exists).
- Whether/when email gets promoted to a real `Seller` table.
