/**
 * POST /api/sales/[id]/report
 *
 * Public abuse/spam reporting on a sale. Anyone with an email can report.
 * Dedupe: same email + same reason against the same sale within 24h is rejected.
 *
 * Reason values:
 *   spam | duplicate | scam | already_over | wrong_address | inappropriate | other
 *
 * Admin moderation happens in /admin/reports (TODO — surface via the
 * existing /api/admin/audit endpoint for now).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const VALID_REASONS = new Set([
  "spam",
  "duplicate",
  "scam",
  "already_over",
  "wrong_address",
  "inappropriate",
  "other",
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // Rate limit: 5 reports / IP / hour — stops drive-by spam.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rl = rateLimit(`report:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many reports. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { email?: string; reason?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const reason = String(body.reason || "").trim().toLowerCase();
  const notes = String(body.notes || "").trim().slice(0, 1000);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  // Confirm sale exists.
  const sale = await prisma.sale.findUnique({ where: { id }, select: { id: true } });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  // 24h dedupe.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dup = await prisma.saleReport.findFirst({
    where: { saleId: id, reporterEmail: email, reason, createdAt: { gte: since } },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await prisma.saleReport.create({
    data: {
      saleId: id,
      reporterEmail: email,
      reason,
      notes,
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true });
}