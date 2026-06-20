import { NextRequest, NextResponse } from "next/server";
import { consumePasswordReset, auditUser } from "@/lib/auth-user";

export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  if (!token || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const ok = await consumePasswordReset(token, password);
  if (!ok) {
    return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
  }
  await auditUser("user.password_reset_completed", "", {});
  return NextResponse.json({ ok: true });
}
