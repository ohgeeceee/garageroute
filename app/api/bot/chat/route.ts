import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getOrCreateConversation } from "@/lib/bot/conversation";
import { streamScout } from "@/lib/bot/stream";
import { headers } from "next/headers";

export const runtime = "nodejs";

/**
 * Web widget chat endpoint.
 *
 * POST body: { message: string, externalId?: string, metadata?: {...} }
 *
 * If the caller doesn't supply externalId, we generate one based on IP +
 * User-Agent + a random nonce. The widget should send the same externalId
 * across messages so context persists across reloads.
 *
 * Response: text/event-stream with token/tool/done/error events.
 */
export async function POST(req: NextRequest) {
  // Rate limit per IP — 30 messages / 5 min keeps costs in check.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rl = rateLimit(`bot:web:${ip}`, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (!rl.ok) {
    return new Response("Too many requests. Try again in a minute.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  let body: { message?: string; externalId?: string; metadata?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    return new Response("Missing message", { status: 400 });
  }
  if (body.message.length > 2000) {
    return new Response("Message too long", { status: 400 });
  }

  const externalId =
    body.externalId ||
    `anon-${ip}-${(body.metadata?.nonce as string) || Math.random().toString(36).slice(2, 10)}`;

  const conv = await getOrCreateConversation({
    channel: "web",
    externalId,
    metadata: { ip, ua: req.headers.get("user-agent") ?? "", ...body.metadata },
  });

  const stream = await streamScout({
    conversationId: conv.id,
    userMessage: body.message.trim(),
    channel: "web",
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Conversation-Id": conv.id,
    },
  });
}

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, endpoint: "scout-chat", method: "POST" }),
    { headers: { "Content-Type": "application/json" } }
  );
}