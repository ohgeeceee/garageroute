/**
 * Next.js instrumentation hook.
 *
 * Runs once per server process at startup. We use it to initialize
 * Sentry (env-gated) so the SDK can capture:
 *   - unhandled exceptions on the server
 *   - server-side console errors
 *   - performance traces (configurable sample rate)
 *
 * Sentry is a no-op without SENTRY_DSN — the SDK throws if you call
 * init() with a missing DSN, so we short-circuit before touching it.
 *
 * The browser/edge SDKs (sentry.client.config.ts / sentry.edge.config.ts)
 * are loaded by Next.js automatically when the @sentry/nextjs package
 * is present, because the Sentry webpack plugin (configured in
 * next.config.ts via withSentryConfig when the env is set) injects
 * them into the bundles.
 *
 * If Sentry is not yet wired (no DSN, no auth token, no org/project),
 * this file still loads cleanly — we just skip init().
 */

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // Sentry not configured. No-op. The app runs unchanged.
    return;
  }

  // Dynamic import keeps the SDK out of the bundle when Sentry is off.
  const Sentry = await import("@sentry/nextjs");

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
  const safeSampleRate = Number.isFinite(tracesSampleRate)
    ? Math.min(Math.max(tracesSampleRate, 0), 1)
    : 0.1;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
      tracesSampleRate: safeSampleRate,
      // Don't send PII (emails, names, addresses). Scrub before send.
      sendDefaultPii: false,
      // Performance: cap breadcrumbs to keep payloads small.
      maxBreadcrumbs: 50,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
      tracesSampleRate: safeSampleRate,
      sendDefaultPii: false,
    });
  }
}
