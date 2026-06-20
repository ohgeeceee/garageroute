import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, auditUser } from "@/lib/auth-user";

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }

  let body: { name?: string; city?: string; state?: string; zip?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length < 2 || n.length > 80) {
      return NextResponse.json({ error: "Name must be 2–80 characters." }, { status: 400 });
    }
    data.name = n;
  }
  if (typeof body.city === "string") data.city = body.city.trim().slice(0, 80);
  if (typeof body.state === "string") data.state = body.state.trim().slice(0, 4);
  if (typeof body.zip === "string") data.zip = body.zip.trim().slice(0, 12);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, city: true, state: true, zip: true, verifiedSeller: true },
  });
  await auditUser("user.profile_update", user.id, { fields: Object.keys(data) });
  return NextResponse.json({ ok: true, user: updated });
}
