import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/admin/inbox/[id]/reply
 *
 * Sends a reply within a thread and persists the outbound EmailMessage.
 *
 * Body: { text: string, html?: string }
 *
 * Sets In-Reply-To + References headers so the customer's mail client
 * threads the reply with the original message.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { text?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const text = String(body.text || "").trim();
  const html = typeof body.html === "string" ? body.html : undefined;
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const thread = await prisma.emailThread.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find the latest inbound message — we reply to that one.
  const lastInbound = thread.messages.find((m) => m.direction === "inbound");

  const subject = thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`;
  const fromHeader = lastInbound?.messageId || "";

  // Build References header: existing references + the message we're replying to.
  const refs = (lastInbound?.references || "").trim();
  const references = refs ? `${refs} ${fromHeader}`.trim() : fromHeader;

  const result = await sendEmail({
    to: thread.fromEmail,
    subject,
    text,
    html,
    inReplyTo: fromHeader,
    references,
    threadId: thread.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || "send failed" },
      { status: result.skipped ? 503 : 502 },
    );
  }

  // Re-open thread if it was closed/archived when admin replied.
  if (thread.status !== "open") {
    await prisma.emailThread.update({
      where: { id: thread.id },
      data: { status: "open" },
    });
  }

  return NextResponse.json({ ok: true, id: result.id });
}