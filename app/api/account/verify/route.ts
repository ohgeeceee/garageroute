import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, auditUser } from "@/lib/auth-user";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }

  let body: { notes?: string; documentUrl?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Cancel any existing pending request
  await prisma.userVerification.updateMany({
    where: { userId: user.id, status: "pending" },
    data: { status: "superseded" },
  });

  const req_ = await prisma.userVerification.create({
    data: {
      userId: user.id,
      notes: String(body.notes ?? "").slice(0, 1000),
      documentUrl: String(body.documentUrl ?? "").slice(0, 500),
      status: "pending",
    },
  });

  await auditUser("user.verification_submitted", user.id, { verificationId: req_.id });
  return NextResponse.json({ ok: true, id: req_.id });
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const items = await prisma.userVerification.findMany({
    where: { userId: user.id },
    orderBy: { submittedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ items });
}
