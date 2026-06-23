/**
 * GET /api/health
 *
 * Lightweight liveness/readiness check for uptime monitors
 * (BetterUptime, Cronitor, etc.). Designed to be cheap: 1 row
 * read against SQLite/Postgres via a `SELECT 1`, no auth, no
 * logging, no rate limiting.
 *
 * Response shape:
 *   200 { ok: true, db: "up" | "down", uptime, version }
 *   503 { ok: false, db: "down", error }   ← only when DB is unreachable
 *
 * This endpoint is intentionally NOT a deep health check — it
 * doesn't ping Resend/Stripe/S3. If you want that, build a
 * separate /api/status page that pings all integrations and
 * cache the result.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const START = Date.now();

export async function GET() {
  const uptime = Math.round((Date.now() - START) / 1000);

  let db: "up" | "down" = "up";
  let dbError: string | undefined;
  try {
    // 1-row read; works on both SQLite and Postgres via Prisma.
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    db = "down";
    dbError = err instanceof Error ? err.message : String(err);
  }

  if (db === "down") {
    return NextResponse.json(
      { ok: false, db, error: dbError, uptime },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    db,
    uptime,
    // Build version is exposed for the deploy dashboard. Optional —
    // unset on local dev is fine.
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_SHA ?? "dev",
  });
}
