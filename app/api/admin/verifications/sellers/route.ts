import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.userVerification.findMany({
    where: { status: "pending" },
    orderBy: { submittedAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, city: true, state: true, createdAt: true } } },
  });
  return NextResponse.json({ rows });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { id?: string; status?: "approved" | "rejected"; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.id || (body.status !== "approved" && body.status !== "rejected")) {
    return NextResponse.json({ error: "id and status (approved|rejected) required" }, { status: 400 });
  }

  const target = await prisma.userVerification.update({
    where: { id: body.id },
    data: {
      status: body.status,
      notes: String(body.notes ?? "").slice(0, 1000),
      reviewedAt: new Date(),
      reviewedBy: "admin",
    },
    include: { user: { select: { id: true } } },
  });

  if (body.status === "approved") {
    await prisma.user.update({
      where: { id: target.user.id },
      data: { verifiedSeller: true },
    });
  }

  await logAudit({
    action: body.status === "approved" ? "user.verify_seller" : "user.reject_seller",
    entity: "user",
    entityId: target.user.id,
    metadata: { verificationId: body.id, notes: body.notes ?? "" },
  });

  return NextResponse.json({ ok: true });
}
