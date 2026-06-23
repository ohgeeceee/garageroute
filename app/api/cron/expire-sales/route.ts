/**
 * POST /api/cron/expire-sales
 *
 * Sweeps active sales whose `expiresAt` has passed and flips them to
 * status="ended". Idempotent — running it twice in a minute is fine.
 *
 * Auth: bearer token = CRON_SECRET env var. Schedule with cron-job.org,
 * EasyCron, or `curl -H "Authorization: Bearer $CRON_SECRET" ...` from
 * system cron. Expected cadence: once an hour.
 *
 * Returns a JSON summary so the cron service can log it.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find active sales past their expiresAt. We don't try to parse the
  // free-form `dates` field here — sellers explicitly set expiresAt on
  // create. Default TTL is set by the POST /api/sales handler.
  const expired = await prisma.sale.findMany({
    where: {
      status: "active",
      expiresAt: { lt: now, not: null },
    },
    select: { id: true, title: true, expiresAt: true, sellerUserId: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ ok: true, expired: 0, at: now.toISOString() });
  }

  // Bulk update. statusChangedAt = now so UI can show "ended 2 days ago".
  await prisma.sale.updateMany({
    where: { id: { in: expired.map((s) => s.id) } },
    data: {
      status: "ended",
      statusChangedAt: now,
      statusNote: "Auto-ended: expiresAt passed",
    },
  });

  return NextResponse.json({
    ok: true,
    expired: expired.length,
    ids: expired.map((s) => s.id),
    at: now.toISOString(),
  });
}

// Also support GET for easy curl-from-browser smoke tests (still requires token).
export const GET = POST;