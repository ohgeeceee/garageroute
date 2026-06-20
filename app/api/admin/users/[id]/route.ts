import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { sessions: true, sales: true, verifications: true, passwordResets: true } },
      sales: { select: { id: true, title: true, verified: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
      verifications: { orderBy: { submittedAt: "desc" }, take: 5 },
      sessions: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { name?: string; status?: string; verifiedSeller?: boolean; role?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim().slice(0, 80);
  if (body.status === "active" || body.status === "suspended" || body.status === "deleted") data.status = body.status;
  if (typeof body.verifiedSeller === "boolean") data.verifiedSeller = body.verifiedSeller;
  if (body.role === "user" || body.role === "admin") data.role = body.role;

  const user = await prisma.user.update({ where: { id }, data, select: { id: true, status: true, verifiedSeller: true, role: true, name: true } });
  await logAudit({
    action: "user.update",
    entity: "user",
    entityId: id,
    metadata: { fields: Object.keys(data), new: data },
  });
  return NextResponse.json({ ok: true, user });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "1";

  if (hard) {
    await prisma.user.delete({ where: { id } });
    await logAudit({ action: "user.delete_hard", entity: "user", entityId: id });
    return NextResponse.json({ ok: true, hard: true });
  }

  await prisma.user.update({ where: { id }, data: { status: "deleted" } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await logAudit({ action: "user.delete_soft", entity: "user", entityId: id });
  return NextResponse.json({ ok: true, hard: false });
}
