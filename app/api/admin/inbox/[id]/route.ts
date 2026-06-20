import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/inbox/[id]
 *
 * Returns a single thread with all messages in chronological order.
 * Marks the thread as read on fetch.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const thread = await prisma.emailThread.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark as read (best-effort, don't block response).
  prisma.emailThread
    .update({
      where: { id },
      data: { lastReadAt: new Date() },
    })
    .catch(() => undefined);

  return NextResponse.json(thread);
}

/**
 * PATCH /api/admin/inbox/[id]
 *
 * Update thread metadata — currently just status (open/closed/archived).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const status = String(body.status || "").trim();
  if (!["open", "closed", "archived"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const updated = await prisma.emailThread.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}