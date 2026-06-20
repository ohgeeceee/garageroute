import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, auditUser } from "@/lib/auth-user";

/* Same helpers as the list/create endpoint */
function trim(s: unknown, max: number): string {
  const v = String(s ?? "").trim();
  return v.length > max ? v.slice(0, max) : v;
}

async function loadOwned(userId: string, id: string) {
  return prisma.sale.findFirst({
    where: { id, sellerUserId: userId },
    include: { items: true, _count: { select: { messages: true, reservations: true, queues: true } } },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch (r) { return r as Response; }
  const { id } = await params;
  const sale = await loadOwned(user.id, id);
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sale);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch (r) { return r as Response; }
  const { id } = await params;

  const owned = await prisma.sale.findFirst({ where: { id, sellerUserId: user.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  for (const k of ["title", "type", "address", "city", "state", "zip", "dates", "hours", "description"] as const) {
    if (typeof body[k] === "string") data[k] = trim(body[k], k === "description" ? 2000 : 200);
  }
  for (const k of ["lat", "lng"] as const) {
    if (typeof body[k] === "number" && Number.isFinite(body[k])) data[k] = body[k];
  }

  const sale = await prisma.sale.update({
    where: { id },
    data,
    select: { id: true, title: true, updatedAt: true },
  });
  await auditUser("sale.update", id, { via: "account", fields: Object.keys(data) });
  return NextResponse.json({ ok: true, sale });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch (r) { return r as Response; }
  const { id } = await params;

  const owned = await prisma.sale.findFirst({ where: { id, sellerUserId: user.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sale.delete({ where: { id } });
  await auditUser("sale.delete", id, { via: "account" });
  return NextResponse.json({ ok: true });
}
