import { prisma } from "@/lib/prisma";
import { botConfig } from "./config";
import { sendEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/auth-user";

/**
 * Magic link flow for support actions.
 *
 * When the user wants to do something account-scoped, the bot calls
 * magic_link_request(email). We send an email with a short-lived token.
 * The user clicks → /bot/verify?token=... → we set a verifiedSession cookie
 * tied to the conversation. Subsequent support tool calls use this cookie
 * to authorise actions.
 *
 * We piggyback on the existing gr_session cookie shape so we don't need
 * a parallel auth system — verified users get a real Session row.
 */

const COOKIE_NAME = "gr_session";

export async function issueMagicLink(args: {
  email: string;
  conversationId: string;
}): Promise<{ ok: boolean; token: string | null; reason?: string }> {
  const email = args.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // We don't tell the bot whether the user exists — the email could be a typo
    // and we don't want the bot leaking account existence.
    return { ok: true, token: null };
  }
  const token = cryptoToken();
  const expiresAt = new Date(Date.now() + botConfig.magicLinkTtlMs);
  await prisma.magicLink.create({
    data: {
      conversationId: args.conversationId,
      email,
      token,
      expiresAt,
    },
  });

  const url = `${botConfig.publicBaseUrl}/bot/verify?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Sign in to GarageRoute",
    body:
      `Hi! Click the link below to confirm it's you and let Scout help with your account.\n\n` +
      `${url}\n\n` +
      `This link expires in 15 minutes. If you didn't ask for this, ignore this email.`,
    kind: "magic_link",
    metadata: { conversationId: args.conversationId },
  });
  return { ok: true, token };
}

export async function consumeMagicLink(token: string): Promise<{
  ok: boolean;
  email?: string;
  conversationId?: string;
  reason?: string;
}> {
  const row = await prisma.magicLink.findUnique({ where: { token } });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  await prisma.magicLink.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return { ok: true, email: row.email, conversationId: row.conversationId };
}

/**
 * Resolve the User for a support action. Uses the cookie session first
 * (the user may already be signed in via web), otherwise looks up the
 * most recently-verified magic-link user for this conversation.
 */
export async function resolveSupportUser(args: {
  conversationId: string;
}): Promise<{ id: string; email: string } | null> {
  const cookieUser = await getCurrentUser();
  if (cookieUser && cookieUser.status === "active") {
    return { id: cookieUser.id, email: cookieUser.email };
  }
  // Fall back to the most-recent unexpired magic link for this conversation.
  const link = await prisma.magicLink.findFirst({
    where: {
      conversationId: args.conversationId,
      usedAt: { not: null },
      expiresAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { usedAt: "desc" },
  });
  if (!link) return null;
  const user = await prisma.user.findUnique({ where: { email: link.email } });
  if (!user || user.status !== "active") return null;
  return { id: user.id, email: user.email };
}

function cryptoToken(): string {
  // Edge-compatible token generator.
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export { COOKIE_NAME as MAGIC_LINK_COOKIE };