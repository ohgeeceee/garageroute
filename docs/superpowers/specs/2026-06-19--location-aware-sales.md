# Location-Aware Sales Discovery

**Date:** 2026-06-19
**Status:** Approved
**Owner:** Jon (founder)

## Goal

Show users garage/yard sales near them, with a polished browsing experience that turns anonymous visitors into saved-favorite, return-visitor accounts.

## Scope

Six features ship together as one cohesive discovery experience:

1. **Location filter** — geolocation with zip fallback, 25 mi default radius
2. **This-weekend default** — `/sales` opens to Fri–Sun sales by default
3. **Distance badges** — every card shows miles from user
4. **Map toggle** — list ↔ map on `/sales`
5. **Saved sales (favorites)** — heart icon, requires auth, new `Favorite` table
6. **Verified seller badge** — show ✓ on cards where `Sale.verified` OR `User.verifiedSeller` is true

## Decisions (locked from brainstorming)

| Decision | Value | Rationale |
|---|---|---|
| Location method | Browser geolocation + zip fallback | Standard marketplace UX, no permission wall |
| Default radius | 25 miles | Matches existing `Alert.radius` default, comfortable weekend range |
| Distance calc | Haversine in JS at filter time | N is small, no DB extension needed |
| Storage (guest) | `localStorage` | Zero friction, works anonymously |
| Storage (logged-in) | User model fields `homeLat/Lng/Zip` | Persistence across devices |
| Geocoding source | Nominatim (existing) | Already wired, cache zips in `data/zip-cache.json` |
| Favorites | New `Favorite` table | Clean normalization, indexed by user |

## Data model

```prisma
model Favorite {
  id        String   @id @default(uuid())
  userId    String
  saleId    String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sale      Sale     @relation(fields: [saleId], references: [id], onDelete: Cascade)
  @@unique([userId, saleId])
  @@index([userId])
}

model User {
  // ...existing fields...
  homeLat   Float?
  homeLng   Float?
  homeZip   String?
  favorites Favorite[]
}
```

## API surface

| Method | Route | Notes |
|---|---|---|
| GET | `/api/sales` | Add `lat`, `lng`, `radius`, `when` params |
| GET | `/api/geocode?zip=` | Forward-geocode a US zip → `{lat, lng, city, state}` |
| GET | `/api/favorites` | Current user's favorited sales (auth required) |
| POST | `/api/favorites` | `{saleId}` (auth required) |
| DELETE | `/api/favorites/[saleId]` | (auth required) |

### Sales filtering semantics

When `lat` + `lng` provided:
1. Pre-filter in SQL using bounding box (`lat ± delta`, `lng ± delta` for radius)
2. Compute exact Haversine in JS, drop anything outside `radius` miles
3. Sort by distance ascending; verified sales tie-break by date
4. Return `distanceMi` field per sale

When `when` provided:
- `weekend` (default) — sale dates overlap next Fri 00:00 → Sun 23:59
- `7d` — within next 7 days
- `all` — no time filter

## Files

### New

- `lib/distance.ts` — `haversineMiles`, `boundingBox`
- `lib/location.ts` — localStorage helpers, browser geo, Nominatim call
- `lib/auth.ts` — minimal session getter (read `Session` table by cookie)
- `app/api/geocode/route.ts`
- `app/api/favorites/route.ts`
- `app/api/favorites/[saleId]/route.ts`
- `app/sales/SalesBrowser.tsx` (client component)
- `components/LocationBar.tsx`
- `components/SalesMap.tsx`
- `components/FavoriteButton.tsx`
- `components/WeekendTabs.tsx`
- `data/zip-cache.json` (gitignored, runtime)

### Modified

- `prisma/schema.prisma` — add `Favorite`, extend `User`
- `app/api/sales/route.ts` — distance + time filtering
- `app/sales/page.tsx` — server-pass lat/lng/radius/when to client
- `components/SaleCard.tsx` — distance, verified, heart
- `components/DynamicMap.tsx` — no change, reused
- `app/account/page.tsx` — show favorites list

## UX flow

1. Land on `/sales`. `LocationBar` reads localStorage.
2. **No location:** banner "Show sales near you" → "Use my location" button + zip input. On submit: store `{lat, lng, zip, city, state}` in localStorage. Reload.
3. **Location set:** show "📍 12.3 mi from Denver, CO 80202 · [Change]". Sales list pre-filtered to 25 mi, sorted by distance, default tab "This weekend".
4. Toggle list/map via segmented control above grid.
5. Each card: photo, title, type chip, distance badge, verified ✓ (if applicable), heart button, dates, hours, address, top-3 items, "View sale" link.
6. Click heart logged-out → toast "Sign in to save sales" + `/login?next=/sales`.
7. Click heart logged-in → optimistic toggle, POST/DELETE, refetch favorites count.
8. Top CTA "Notify me when sales in [zip] are posted" — submits to existing `/api/alerts`.

## Edge cases

- **Geolocation denied:** fall back to zip modal. Don't block browsing.
- **No sales in radius:** empty state with "Expand to 50 mi" one-tap button.
- **Map fail:** graceful list-only fallback.
- **Nominatim rate limit (1 req/sec):** zip cache dedupes.
- **User signed in, no `homeLat/Lng` yet:** fall back to localStorage; on next ZIP-CTA submit, persist to User.
- **Stale location (>30 days):** prompt to confirm.

## Out of scope (deferred)

- Push/email alerts (no SMTP yet)
- "Sales opening today" real-time notifications
- Multi-stop route from current location (existing `/route` is separate)
- IP-based geolocation fallback (privacy)

## Testing

No test runner exists. Manual:
- `npm run lint` passes
- `npm run build` succeeds
- Browse anonymously, set location via zip, see filtered results
- Set via geolocation in browser (dev only)
- Toggle list/map
- Toggle weekend tabs
- Sign in, favorite a sale, see it on `/account`
- Click heart logged-out, see login prompt
- Smoke test on VPS after deploy