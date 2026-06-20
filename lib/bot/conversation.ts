import { prisma } from "@/lib/prisma";
import type { BotConversation, BotMessage } from "@prisma/client";

/**
 * Conversation state management.
 *
 * Each external channel produces a stable externalId:
 *  - web: random anonymous id stored in widget localStorage (becomes userId on magic-link verify)
 *  - fb: page-scoped id (PSID)
 *
 * Messages are stored in two places:
 *  - DB (BotMessage) — full history, used for admin viewing and analytics
 *  - Inline context (BotConversation.context) — last few + any state the bot needs
 */

export type BotChannel = "web" | "fb" | "system";

export async function getOrCreateConversation(args: {
  channel: BotChannel;
  externalId: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<BotConversation> {
  const existing = await prisma.botConversation.findFirst({
    where: { channel: args.channel, externalId: args.externalId },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) {
    const update: Record<string, unknown> = {};
    if (args.userId && existing.userId !== args.userId) update.userId = args.userId;
    if (Object.keys(update).length > 0) {
      return prisma.botConversation.update({ where: { id: existing.id }, data: update });
    }
    return existing;
  }
  return prisma.botConversation.create({
    data: {
      channel: args.channel,
      externalId: args.externalId,
      userId: args.userId ?? null,
      mode: "marketing",
      metadata: JSON.stringify(args.metadata ?? {}),
    },
  });
}

export async function appendMessage(args: {
  conversationId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolName?: string;
  toolCallId?: string;
}): Promise<BotMessage> {
  const msg = await prisma.botMessage.create({
    data: {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      toolName: args.toolName ?? "",
      toolCallId: args.toolCallId ?? "",
    },
  });
  await prisma.botConversation.update({
    where: { id: args.conversationId },
    data: { lastMessageAt: new Date() },
  });
  return msg;
}

export async function setMode(conversationId: string, mode: "marketing" | "support" | "handoff"): Promise<void> {
  await prisma.botConversation.update({ where: { id: conversationId }, data: { mode } });
}

export type ConversationContext = {
  // The current sale being discussed, if any
  saleId?: string;
  // In-progress draft listing (seller mode)
  draftListing?: {
    title?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    dates?: string;
    hours?: string;
    description?: string;
    items?: { name: string; category?: string; price?: number }[];
  };
  // Leads captured in this conversation (so we don't ask twice)
  capturedEmails?: string[];
  // Last user email seen (for magic-link support)
  lastEmail?: string;
};

export async function getContext(conversationId: string): Promise<ConversationContext> {
  const conv = await prisma.botConversation.findUnique({ where: { id: conversationId } });
  if (!conv) return {};
  try {
    return JSON.parse(conv.context || "{}") as ConversationContext;
  } catch {
    return {};
  }
}

export async function patchContext(
  conversationId: string,
  patch: Partial<ConversationContext>
): Promise<ConversationContext> {
  const current = await getContext(conversationId);
  const next: ConversationContext = { ...current, ...patch };
  await prisma.botConversation.update({
    where: { id: conversationId },
    data: { context: JSON.stringify(next) },
  });
  return next;
}

export async function recordAction(args: {
  conversationId: string;
  toolName: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await prisma.botAction.create({
    data: {
      conversationId: args.conversationId,
      toolName: args.toolName,
      args: JSON.stringify(args.args ?? {}),
      result: JSON.stringify(args.result ?? {}),
      success: args.success,
      errorMessage: args.errorMessage ?? "",
    },
  });
}

export async function getRecentMessages(conversationId: string, limit = 20): Promise<BotMessage[]> {
  return prisma.botMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function findOrCreateLead(args: {
  email: string;
  zip?: string;
  wishlist?: string[];
  source?: string;
  conversationId?: string;
}): Promise<{ id: string; created: boolean }> {
  const email = args.email.trim().toLowerCase();
  const existing = await prisma.lead.findFirst({ where: { email } });
  if (existing) {
    // Merge wishlist + zip if missing.
    const existingWishlist = JSON.parse(existing.wishlist || "[]") as string[];
    const merged = Array.from(new Set([...existingWishlist, ...(args.wishlist ?? [])]));
    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        zip: existing.zip || args.zip || "",
        wishlist: JSON.stringify(merged),
        conversationId: existing.conversationId || args.conversationId || null,
      },
    });
    return { id: existing.id, created: false };
  }
  const lead = await prisma.lead.create({
    data: {
      email,
      zip: args.zip ?? "",
      wishlist: JSON.stringify(args.wishlist ?? []),
      source: args.source ?? "web",
      conversationId: args.conversationId ?? null,
    },
  });
  return { id: lead.id, created: true };
}