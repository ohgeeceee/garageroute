import { NextRequest, NextResponse } from "next/server";
import { runScout } from "@/lib/bot/runner";
import { botConfig, messengerEnabled } from "@/lib/bot/config";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Facebook Messenger webhook.
 *
 *  - GET  : webhook verification handshake. Meta sends ?hub.mode=subscribe
 *           &hub.verify_token=...&hub.challenge=...; we echo challenge when
 *           verify_token matches FB_VERIFY_TOKEN.
 *
 *  - POST : page event(s). For each entry[messaging] message, fetch user
 *           profile, get/create conversation, run scout (non-streaming —
 *           FB Send API doesn't accept SSE), then POST the reply back to
 *           Meta.
 *
 *    Always respond 200 quickly — Meta retries on 5xx.
 */

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === botConfig.fb.verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  // Always 200 fast — Meta retries on 5xx and that floods our logs.
  if (!messengerEnabled()) {
    // Still ack so Meta doesn't retry; log loudly.
    // eslint-disable-next-line no-console
    console.warn("[scout:fb] webhook called but FB creds missing — message dropped");
    return NextResponse.json({ ok: false, reason: "fb_disabled" });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" });
  }

  // Ack immediately, process async. This matters because Meta has a ~5s timeout
  // and the LLM call + tool loop can take 5-15s.
  const ack = NextResponse.json({ ok: true });

  // Process in background — but wait briefly so we can return cleanly.
  void processEvents(body).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[scout:fb] processEvents error:", err);
  });

  return ack;
}

async function processEvents(payload: unknown): Promise<void> {
  type FBMessage = {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: { mid: string; text?: string };
    postback?: { payload: string; title: string };
  };
  type FBEntry = { id: string; time: number; messaging?: FBMessage[] };
  type FBBody = { object: string; entry: FBEntry[] };

  const body = payload as Partial<FBBody>;
  if (body.object !== "page" || !Array.isArray(body.entry)) return;

  for (const entry of body.entry) {
    for (const event of entry.messaging ?? []) {
      const text = event.message?.text;
      if (!text || !text.trim()) continue;
      const psid = event.sender.id;

      // Mark the message as seen + show typing indicator.
      await sendFbAction(psid, "typing_on").catch(() => {});

      // Get/create conversation.
      const conv = await prisma.botConversation.findFirst({
        where: { channel: "fb", externalId: psid },
      });
      let conversationId: string;
      if (conv) {
        conversationId = conv.id;
      } else {
        const created = await prisma.botConversation.create({
          data: {
            channel: "fb",
            externalId: psid,
            mode: "marketing",
            metadata: JSON.stringify({ fb: true, firstSeenAt: new Date().toISOString() }),
          },
        });
        conversationId = created.id;
      }

      const result = await runScout({
        conversationId,
        userMessage: text,
        channel: "fb",
      });

      // Send reply back to Meta.
      await sendFbText(psid, result.reply);
      await sendFbAction(psid, "typing_off").catch(() => {});
    }
  }
}

async function sendFbText(psid: string, text: string): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(botConfig.fb.pageAccessToken)}`;
  // FB Send API caps a single message at 2000 chars; chunk otherwise.
  const chunks = chunkText(text, 1900);
  for (const chunk of chunks) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: chunk },
      }),
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[scout:fb] sendFbText failed:", err);
    });
  }
}

async function sendFbAction(psid: string, action: "typing_on" | "typing_off" | "mark_seen"): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(botConfig.fb.pageAccessToken)}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      sender_action: action,
    }),
  });
}

function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + max, text.length);
    // Try to break on sentence boundary.
    const lastPeriod = text.lastIndexOf(". ", end);
    const lastSpace = text.lastIndexOf(" ", end);
    if (lastPeriod > i + max * 0.5) end = lastPeriod + 1;
    else if (lastSpace > i + max * 0.5) end = lastSpace;
    chunks.push(text.slice(i, end).trim());
    i = end;
  }
  return chunks;
}