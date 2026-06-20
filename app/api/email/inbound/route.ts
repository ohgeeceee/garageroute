import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import {
  parseAddress,
  normalizeSubject,
  extractMessageId,
} from "@/lib/email";

/**
 * Resend inbound webhook.
 *
 * Resend POSTs an `email.received` event when mail is delivered to a verified
 * inbound address (e.g. admin@garageroute.com). Payload shape:
 *   { type: "email.received", data: { from, to, subject, text, html, headers, ... } }
 *
 * Headers of interest for threading:
 *   - message_id, in_reply_to, references (lower-case keys per Resend docs)
 *
 * Docs: https://resend.com/docs/dashboard/webhooks/inbound
 */
export const runtime = "nodejs"; // Svix verifier needs Node crypto

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const raw = await req.text();

  let payload: ResendInboundPayload;
  if (secret) {
    // Verify with Svix-style headers Resend sends.
    const wh = new Webhook(secret);
    try {
      const verified = wh.verify(raw, {
        "svix-id": req.headers.get("svix-id") || "",
        "svix-timestamp": req.headers.get("svix-timestamp") || "",
        "svix-signature": req.headers.get("svix-signature") || "",
      });
      payload = verified as ResendInboundPayload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "invalid signature";
      // eslint-disable-next-line no-console
      console.error("[email-inbound] signature verification failed:", msg);
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else {
    // Dev mode — accept unsigned. Log so it's obvious in production.
    if (process.env.NODE_ENV === "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[email-inbound] RESEND_WEBHOOK_SECRET not set — accepting unsigned requests in production",
      );
    }
    try {
      payload = JSON.parse(raw) as ResendInboundPayload;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
  }

  if (payload.type !== "email.received" || !payload.data) {
    // Acknowledge unknown event types so Resend doesn't retry.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const data = payload.data;
  const fromHdr = data.from || "";
  const toHdr = (Array.isArray(data.to) ? data.to[0] : data.to) || "";
  const from = parseAddress(fromHdr);
  const to = parseAddress(toHdr);
  const subject = data.subject || "(no subject)";
  const bodyText = data.text || "";
  const bodyHtml = data.html || "";

  // Resend passes the original headers as a flat object (lower-case keys).
  const headers = data.headers || {};
  const messageIdHeader = extractMessageId(
    typeof headers["message_id"] === "string" ? headers["message_id"] : Array.isArray(headers["message_id"]) ? headers["message_id"][0] : "",
  );
  const inReplyToHeader = extractMessageId(
    typeof headers["in_reply_to"] === "string" ? headers["in_reply_to"] : Array.isArray(headers["in_reply_to"]) ? headers["in_reply_to"][0] : "",
  );
  const referencesHeader =
    typeof headers["references"] === "string"
      ? headers["references"]
      : Array.isArray(headers["references"])
      ? headers["references"].join(" ")
      : "";

  const fromAddress = from.address || (typeof data.from === "string" ? data.from : "").toLowerCase();
  const fromName = from.name || "";
  const toAddress = to.address || (typeof data.to === "string" ? data.to : toHdr).toLowerCase();
  const toName = to.name || "";

  if (!fromAddress) {
    // eslint-disable-next-line no-console
    console.error("[email-inbound] missing from address", { payload });
    return NextResponse.json({ ok: false, error: "missing from" }, { status: 400 });
  }

  // Threading: try several signals in order.
  const thread = await resolveThread({
    fromEmail: fromAddress,
    fromName,
    subject,
    inReplyTo: inReplyToHeader,
    references: referencesHeader,
  });

  await prisma.emailMessage.create({
    data: {
      threadId: thread.id,
      direction: "inbound",
      fromAddress,
      fromName,
      toAddress,
      toName,
      subject,
      bodyText,
      bodyHtml,
      messageId: messageIdHeader,
      inReplyTo: inReplyToHeader,
      references: referencesHeader,
      status: "received",
      receivedAt: new Date(),
    },
  });

  await prisma.emailThread.update({
    where: { id: thread.id },
    data: {
      lastMessageAt: new Date(),
      lastSnippet: bodyText.slice(0, 200),
      lastDirection: "inbound",
      updatedAt: new Date(),
      // Refresh the canonical fromName if we now have it.
      fromName: thread.fromName || fromName,
    },
  });

  return NextResponse.json({ ok: true });
}

/** Pick the right thread for an inbound message. */
async function resolveThread(args: {
  fromEmail: string;
  fromName: string;
  subject: string;
  inReplyTo: string;
  references: string;
}): Promise<{ id: string; fromName: string }> {
  const { fromEmail, fromName, subject, inReplyTo, references } = args;

  // 1. Match by In-Reply-To / References (a Message-ID we sent out).
  const replyIds = [inReplyTo, ...references.split(/\s+/).filter(Boolean)];
  for (const id of replyIds) {
    if (!id) continue;
    const outbound = await prisma.emailMessage.findFirst({
      where: { messageId: id },
      include: { thread: true },
    });
    if (outbound?.thread) {
      return { id: outbound.thread.id, fromName: outbound.thread.fromName };
    }
  }

  // 2. Match by normalized subject + same sender (most-recent open thread).
  const normalized = normalizeSubject(subject) || "(no subject)";
  const recent = await prisma.emailThread.findFirst({
    where: {
      subject: normalized,
      fromEmail,
      status: { in: ["open", "closed"] },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  if (recent) {
    return { id: recent.id, fromName: recent.fromName };
  }

  // 3. Create a new thread.
  const created = await prisma.emailThread.create({
    data: {
      subject: normalized,
      fromEmail,
      fromName,
      lastSnippet: "(no preview)",
      lastDirection: "inbound",
      lastMessageAt: new Date(),
    },
  });
  return { id: created.id, fromName };
}

/* ------- types ------- */

interface ResendInboundPayload {
  type?: string;
  data?: {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string | string[]>;
    // Older payloads expose the RFC-822 envelope here too — kept for forward-compat.
    [k: string]: unknown;
  };
}