#!/usr/bin/env node
/**
 * Healthcheck helper.
 *
 * Polls /api/health until it returns 200 or the timeout elapses.
 * Designed to be used in a post-deploy hook or as a manual smoke check:
 *
 *   node scripts/healthcheck.mjs                    # localhost:3001
 *   BASE_URL=https://garageroute.com node scripts/healthcheck.mjs
 *
 * Exit codes:
 *   0 = healthy
 *   1 = unhealthy (timeout, 503, or unreachable)
 */
const base = (process.env.BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 60_000);
const intervalMs = Number(process.env.HEALTHCHECK_INTERVAL_MS || 2_000);

const start = Date.now();
let attempt = 0;

async function check() {
  attempt += 1;
  try {
    const res = await fetch(`${base}/api/health`, {
      // Abort if the server is hung so we don't sit on a single bad request.
      signal: AbortSignal.timeout(5_000),
    });
    if (res.status === 200) {
      const body = await res.json();
      if (body.ok) {
        console.log(`[${attempt}] healthy after ${Date.now() - start}ms — db=${body.db}, uptime=${body.uptime}s, version=${body.version}`);
        process.exit(0);
      }
    }
    console.log(`[${attempt}] not ready: HTTP ${res.status}`);
  } catch (err) {
    console.log(`[${attempt}] ${err.code || err.name || "error"}: ${err.message}`);
  }

  if (Date.now() - start >= timeoutMs) {
    console.error(`healthcheck timed out after ${timeoutMs}ms`);
    process.exit(1);
  }
  setTimeout(check, intervalMs);
}

check();
