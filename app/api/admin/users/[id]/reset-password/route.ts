import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-user";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const password = String(body.password ?? "").trim();
  if (password.length < 8) {
    return NextResponse.json({ error: "Temp password must be at least 8 characters." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);
  await logAudit({ action: "user.admin_reset_password", entity: "user", entityId: id });
  return NextResponse.json({ ok: true });
}
