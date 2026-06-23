/**
 * POST /api/admin/ingest/sources
 *
 * Admin-only. Create a new IngestSource (e.g. Craigslist city), pause one,
 * or trigger an immediate run. Used to wire Tier 2 without a full admin UI.
 *
 * Auth: requireAdminUser (session cookie + role=admin).
 *
 * Body shapes:
 *   { action: "create", kind, slug, label, baseUrl, config? }
 *   { action: "pause",   sourceId }
 *   { action: "resume",  sourceId }
 *   { action: "delete",  sourceId }
 *   { action: "run",     sourceId? }   // omit sourceId to run all active
 *
 * Returns the affected source(s) and (for "run") the RunSummary.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/auth-user";
import { ensureAdaptersRegistered } from "@/lib/ingest/registry";
import { getAdapter } from "@/lib/ingest/types";
import { runIngestForSource } from "@/lib/ingest/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch (r) {
    return r as Response;
  }

  ensureAdaptersRegistered();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "");

  switch (action) {
    case "create": {
      const kind = String(body.kind || "").trim();
      const slug = String(body.slug || "").trim().toLowerCase();
      const label = String(body.label || "").trim();
      const baseUrl = String(body.baseUrl || "").trim();
      const config = body.config ? JSON.stringify(body.config) : "{}";

      if (!kind || !slug || !label) {
        return NextResponse.json({ error: "kind, slug, label required" }, { status: 400 });
      }
      if (!getAdapter(kind)) {
        return NextResponse.json({ error: `unknown kind: ${kind}` }, { status: 400 });
      }

      const source = await prisma.ingestSource.upsert({
        where: { kind_slug: { kind, slug } },
        create: { kind, slug, label, baseUrl, config, status: "active" },
        update: { label, baseUrl, config, status: "active" },
      });
      return NextResponse.json({ ok: true, source });
    }

    case "pause":
    case "resume": {
      const sourceId = String(body.sourceId || "");
      if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });
      const source = await prisma.ingestSource.update({
        where: { id: sourceId },
        data: { status: action === "pause" ? "paused" : "active" },
      });
      return NextResponse.json({ ok: true, source });
    }

    case "delete": {
      const sourceId = String(body.sourceId || "");
      if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });
      await prisma.ingestItem.deleteMany({ where: { sourceId } });
      await prisma.ingestSource.delete({ where: { id: sourceId } });
      return NextResponse.json({ ok: true });
    }

    case "run": {
      const sourceId = body.sourceId ? String(body.sourceId) : undefined;
      const where = sourceId ? { id: sourceId } : { status: "active" };
      const sources = await prisma.ingestSource.findMany({ where });
      const summaries = [];
      for (const source of sources) {
        const adapter = getAdapter(source.kind);
        if (!adapter) {
          summaries.push({ sourceId: source.id, skipped: true, reason: "no adapter" });
          continue;
        }
        summaries.push(await runIngestForSource(source.id, adapter));
      }
      return NextResponse.json({ ok: true, summaries });
    }

    default:
      return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  }
}