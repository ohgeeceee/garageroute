import "server-only";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

/**
 * GarageRoute's outbound email wrapper.
 *
 * All app code goes through sendEmail() so we can:
 *  - gate on RESEND_API_KEY
 *  - stamp every outbound message with our from address + reply-to
 *  - persist every send to EmailMessage for the admin inbox / threading
 *  - keep useful logs when something fails
 *
 * Inbound mail arrives at /api/email/inbound and is also written to EmailMessage
 * so the admin UI sees both sides of every conversation.
 */

const apiKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || "GarageRoute <admin@garageroute.com>";
const replyTo = process.env.RESEND_REPLY_TO || "admin@garageroute.com";

export const resend = apiKey ? new Resend(apiKey) : null;

export const EMAIL_FROM = fromEmail;
export const EMAIL_REPLY_TO = replyTo;

export function emailEnabled(): boolean {
  return Boolean(apiKey);
}

/** Parse a "Name <addr@host>" style header into {name, address}. */
export function parseAddress(header: string | null | undefined): { name: string; address: string } {
  if (!header) return { name: "", address: "" };
  const trimmed = header.trim();
  // Match "Name <addr>" — allow quoted names with commas.
  const angle = trimmed.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (angle) {
    return { name: (angle[1] || "").trim(), address: (angle[2] || "").trim().toLowerCase() };
  }
  // Bare address.
  if (/^[^@\s]+@[^@\s]+$/.test(trimmed)) {
    return { name: "", address: trimmed.toLowerCase() };
  }
  return { name: "", address: "" };
}

/** Strip leading Re:/Fwd:/Fw: prefixes for thread-subject matching. */
export function normalizeSubject(subject: string | null | undefined): string {
  if (!subject) return "";
  return subject
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract a Message-ID header value without the angle brackets. */
export function extractMessageId(header: string | null | undefined): string {
  if (!header) return "";
  const m = header.match(/<([^>]+)>/);
  return (m ? m[1] : header).trim();
}

export interface SendMailArgs {
  to: string | string[];
  subject: string;
  /** Plain-text body. Aliased as `body` for backwards-compat with bot callers. */
  text?: string;
  body?: string;
  html?: string;
  /** When replying inside a thread, pass the inbound message to thread via In-Reply-To. */
  inReplyTo?: string;
  /** Pass the inbound References header so the thread stays grouped in clients. */
  references?: string;
  /** Set this when sending from the admin reply UI — links the outbound EmailMessage to the EmailThread. */
  threadId?: string;
  /** Optional pre-generated Message-ID to attach to the outbound message. */
  customMessageId?: string;
  /** Optional classification — used by bot callers to tag the queue row. */
  kind?: string;
  /** Optional metadata JSON — used by bot callers. */
  metadata?: Record<string, unknown>;
}

export interface SendMailResult {
  ok: boolean;
  id?: string;       // Resend message id
  error?: string;
  skipped?: boolean; // true if RESEND_API_KEY unset
}

/**
 * Send mail via Resend and persist an EmailMessage record.
 *
 * If `threadId` is supplied, the new EmailMessage is attached to that thread.
 * Otherwise a thread is found (or created) by subject + recipient.
 *
 * Also enqueues a row in the legacy `PendingEmail` table when bot-style
 * `kind`/`metadata` are supplied — useful for ops debugging.
 */
export async function sendEmail(args: SendMailArgs): Promise<SendMailResult> {
  const { to, subject, html, inReplyTo, references, threadId, customMessageId, kind, metadata } = args;
  const text = args.text || args.body || "";
  if (!text && !html) {
    return { ok: false, error: "missing body" };
  }

  const toList = (Array.isArray(to) ? to : [to]).map((s) => s.trim()).filter(Boolean);
  if (toList.length === 0) {
    return { ok: false, error: "missing recipient" };
  }

  const ourMessageId =
    customMessageId ||
    `<${crypto.randomUUID()}@garageroute.com>`;

  // Resolve / create thread
  let thread = threadId
    ? await prisma.emailThread.findUnique({ where: { id: threadId } })
    : null;

  if (!thread) {
    const normalized = normalizeSubject(subject) || "(no subject)";
    const primaryTo = toList[0];
    // Try to match an existing thread by (subject, primary recipient).
    thread = await prisma.emailThread.findFirst({
      where: { subject: normalized, fromEmail: primaryTo.toLowerCase() },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!thread) {
      thread = await prisma.emailThread.create({
        data: {
          subject: normalized,
          fromEmail: primaryTo.toLowerCase(),
          fromName: "",
          lastSnippet: text.slice(0, 200),
          lastDirection: "outbound",
          lastMessageAt: new Date(),
        },
      });
    }
  }

  // Persist outbound message FIRST so resendMessageId is recorded even if Resend fails.
  const persisted = await prisma.emailMessage.create({
    data: {
      threadId: thread.id,
      direction: "outbound",
      fromAddress: replyTo,
      fromName: "GarageRoute",
      toAddress: toList[0].toLowerCase(),
      toName: "",
      subject,
      bodyText: text,
      bodyHtml: html || "",
      messageId: ourMessageId,
      inReplyTo: inReplyTo || "",
      references: references || "",
      status: "pending",
    },
  });

  // Mirror to the legacy PendingEmail queue so the bot / ops tooling sees a unified log.
  if (kind) {
    prisma.pendingEmail
      .create({
        data: {
          to: toList[0].toLowerCase(),
          subject,
          body: text,
          kind,
          metadata: JSON.stringify(metadata || {}),
          status: "pending",
        },
      })
      .catch(() => undefined);
  }

  // If no API key, mark as failed and return so callers can fall back.
  if (!resend) {
    await prisma.emailMessage.update({
      where: { id: persisted.id },
      data: {
        status: "failed",
        error: "RESEND_API_KEY not configured",
      },
    });
     
    console.warn("[email] RESEND_API_KEY missing — not sending", { to: toList, subject });
    return { ok: false, error: "RESEND_API_KEY not configured", skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toList,
      replyTo,
      subject,
      text,
      html: html || text,
      headers: {
        "Message-ID": ourMessageId,
        ...(inReplyTo ? { "In-Reply-To": inReplyTo } : {}),
        ...(references ? { References: references } : {}),
      },
    });

    if (error || !data) {
      const msg = error?.message || "unknown Resend error";
      await prisma.emailMessage.update({
        where: { id: persisted.id },
        data: { status: "failed", error: msg },
      });
      return { ok: false, error: msg };
    }

    await prisma.emailMessage.update({
      where: { id: persisted.id },
      data: {
        status: "sent",
        resendMessageId: data.id,
        sentAt: new Date(),
      },
    });

    // Bump thread pointer.
    await prisma.emailThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
        lastSnippet: text.slice(0, 200),
        lastDirection: "outbound",
        updatedAt: new Date(),
      },
    });

    return { ok: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.emailMessage.update({
      where: { id: persisted.id },
      data: { status: "failed", error: msg },
    });
    return { ok: false, error: msg };
  }
}