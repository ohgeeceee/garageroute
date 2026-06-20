import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireUser, verifyPassword, auditUser } from "@/lib/auth-user";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }

  let body: { current?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = String(body.current ?? "");
  const next = String(body.next ?? "");
  if (next.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const ok = await verifyPassword(current, fresh.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await hashPassword(next);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  await auditUser("user.password_change", user.id, {});
  return NextResponse.json({ ok: true });
}
