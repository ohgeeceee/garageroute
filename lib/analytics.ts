/**
 * Plausible Analytics helper.
 *
 * Plausible is privacy-friendly and doesn't require a cookie banner.
 * The script is loaded globally via <Script> in app/layout.tsx, so we
 * just need a thin wrapper to call its `plausible()` global safely.
 *
 * Every call is wrapped in a try/catch and a feature check — if the
 * script is blocked (ad-blocker, network failure, SSR), the call
 * silently no-ops. Never let analytics take down the app.
 *
 * Conventions:
 *  - Use snake_case event names. Plausible's UI shows them as-is.
 *  - Pass props as a flat object (max depth 1) — Plausible flattens
 *    them into its dashboard.
 *  - Don't pass PII (emails, names, addresses). Plausible is
 *    privacy-first and will reject them server-side anyway.
 */

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void;
  }
}

export type AnalyticsEvent =
  // Signup funnel
  | "signup_started"
  | "signup_complete"
  | "signup_failed"
  // Sale posting funnel
  | "sale_post_started"
  | "sale_post_complete"
  | "sale_post_failed"
  // Route planning (high-intent engagement signal)
  | "route_add_sale"
  | "route_remove_sale"
  | "route_optimize"
  // Alerts
  | "alert_subscribed"
  // Sales browse engagement
  | "sale_detail_view"
  | "filter_applied"
  // Search (if / when implemented)
  | "search_submitted";

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.plausible === "function") {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Analytics must never break the app. Swallow.
  }
}

/**
 * Fire-and-forget pageview tracking for SPA route changes.
 * Pair with a useEffect that calls this on pathname change.
 * (Currently unused — Plausible auto-tracks pageviews from the
 *  global script via the data-api attribute.)
 */
export function trackPageview(url?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.plausible === "function") {
      window.plausible("pageview", url ? { u: url } : undefined);
    }
  } catch {
    // ignore
  }
}