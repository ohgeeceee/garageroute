import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, isValidEmail, normalizeEmail, verifyPassword, auditUser } from "@/lib/auth-user";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (!isValidEmail(email) || !password) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "active") {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await auditUser("user.login_failed", user.id, { email });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);
  await auditUser("user.login", user.id, { email });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      verifiedSeller: user.verifiedSeller,
      role: user.role,
    },
  });
}
