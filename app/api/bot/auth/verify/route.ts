import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/bot/magicLink";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth-user";

export const runtime = "nodejs";

/**
 * Magic-link consume endpoint.
 *
 * GET /api/bot/auth/verify?token=...
 *  - marks the magic link used
 *  - creates a real Session for the user (sets gr_session cookie)
 *  - links the conversation.userId to the user
 *  - redirects to /bot/verify?ok=1 or ?error=...
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/bot/verify?error=missing", req.url));

  const result = await consumeMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/bot/verify?error=${result.reason}`, req.url));
  }

  const email = result.email!;
  const conversationId = result.conversationId!;

  // Find or create the user (this handles the rare case where someone
  // tries to verify an email that doesn't have an account).
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't auto-create accounts here — just fail with a friendly message.
    return NextResponse.redirect(new URL("/bot/verify?error=no_account", req.url));
  }

  // Issue a real session (sets the cookie).
  await createSession(user.id);

  // Link the conversation to the user.
  await prisma.botConversation.update({
    where: { id: conversationId },
    data: { userId: user.id, mode: "support" },
  });

  // Send them back to wherever they came from (widget pops the chat).
  const next = req.nextUrl.searchParams.get("next") || "/";
  return NextResponse.redirect(new URL(`/bot/verify?ok=1&next=${encodeURIComponent(next)}`, req.url));
}