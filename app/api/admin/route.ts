import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const u = process.env.ADMIN_USERNAME;
  const p = process.env.ADMIN_PASSWORD;
  return NextResponse.json({ configured: Boolean(u && p) });
}

export async function POST(req: NextRequest) {
  const u = process.env.ADMIN_USERNAME;
  const p = process.env.ADMIN_PASSWORD;

  if (!u || !p) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  let username = "";
  let password = "";

  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    [username, password] = decoded.split(":");
  } else {
    try {
      const body = await req.json();
      username = body.username || "";
      password = body.password || "";
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
  }

  if (username === u && password === p) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    await logAudit({
      actor: u,
      action: "admin.login",
      entity: "system",
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_session");
  await logAudit({
    action: "admin.logout",
    entity: "system",
  });
  return res;
}
