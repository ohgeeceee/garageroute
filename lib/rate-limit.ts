/**
 * Simple in-memory rate limiter.
 *
 * - Key: arbitrary string (e.g. "verify:user-123" or "ip:1.2.3.4")
 * - Limit: max events in the window
 * - Window: rolling time window
 *
 * Memory usage: O(active keys * 1) — fine for a single-instance Next.js server.
 * For multi-instance prod, swap for Redis (`INCR` + `EXPIRE`) without changing callers.
 *
 * Garbage collection: stale buckets are pruned lazily on each call.
 */

type Bucket = { count: number; resetAt: number };

const STORE = new Map<string, Bucket>();
const LAST_GC = { at: 0 };
const GC_INTERVAL_MS = 60_000; // sweep every minute

type LimitOpts = { limit: number; windowMs: number };

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSec: number; resetAt: number };

export function rateLimit(key: string, opts: LimitOpts): RateLimitResult {
  maybeGC();

  const now = Date.now();
  const existing = STORE.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    STORE.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.limit - 1, resetAt };
  }

  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000), resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: Math.max(0, opts.limit - existing.count), resetAt: existing.resetAt };
}

function maybeGC() {
  const now = Date.now();
  if (now - LAST_GC.at < GC_INTERVAL_MS) return;
  LAST_GC.at = now;
  for (const [k, v] of STORE) {
    if (v.resetAt <= now) STORE.delete(k);
  }
}

/** Reset all counters — useful for tests and admin overrides. */
export function rateLimitReset(): void {
  STORE.clear();
}
