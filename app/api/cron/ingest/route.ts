/**
 * POST /api/cron/ingest
 *
 * Runs all active IngestSources. Bearer auth via CRON_SECRET, same as
 * /api/cron/expire-sales.
 *
 * Schedule: hourly.
 *
 * Body (optional, JSON):
 *   { sourceIds?: string[] }   // limit to specific sources for testing
 *
 * Response: { sources: RunSummary[], totalMs: number }
 *
 * Each summary includes fetched/new/updated/errors counts. Inspect via
 * /admin or the IngestSource.lastRunAt / .lastError columns.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdaptersRegistered } from "@/lib/ingest/registry";
import { getAdapter } from "@/lib/ingest/types";
import { runIngestForSource } from "@/lib/ingest/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  ensureAdaptersRegistered();

  let body: { sourceIds?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const where = body.sourceIds && body.sourceIds.length > 0
    ? { id: { in: body.sourceIds } }
    : { status: "active" };

  const sources = await prisma.ingestSource.findMany({ where });
  const start = Date.now();

  const summaries = [];
  for (const source of sources) {
    const adapter = getAdapter(source.kind);
    if (!adapter) {
      summaries.push({
        sourceId: source.id,
        kind: source.kind,
        slug: source.slug,
        skipped: true,
        reason: `no adapter registered for kind=${source.kind}`,
      });
      continue;
    }
    summaries.push(await runIngestForSource(source.id, adapter));
  }

  return NextResponse.json({
    sources: summaries,
    totalMs: Date.now() - start,
    at: new Date().toISOString(),
  });
}

export const GET = POST;