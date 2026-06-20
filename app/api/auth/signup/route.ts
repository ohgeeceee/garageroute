import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, isValidEmail, normalizeEmail, auditUser } from "@/lib/auth-user";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Please enter your name (2–80 characters)." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, verifiedSeller: true },
  });

  await createSession(user.id);
  await auditUser("user.signup", user.id, { email });

  return NextResponse.json({ ok: true, user });
}
