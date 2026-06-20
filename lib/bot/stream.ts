import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type LanguageModel, type ModelMessage } from "ai";
import { botConfig, botEnabled, BOT_NAME } from "./config";
import { buildSystemPrompt } from "./system";
import { buildTools } from "./tools";
import { appendMessage, setMode } from "./conversation";
import { getCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

/**
 * Streaming Scout runner. Used by the web widget.
 *
 * Output format: Server-Sent Events (text/event-stream). Events:
 *  - "token" : a chunk of the assistant text reply
 *  - "tool"  : { name, args, result } when a tool call completes
 *  - "done"  : { mode, degraded } final event
 *  - "error" : { message }
 *
 * This is simpler than Vercel AI SDK's full UI message stream protocol — but
 * the widget is custom-built anyway, so a minimal SSE format is cleaner.
 */

export type StreamArgs = {
  conversationId: string;
  userMessage: string;
  channel: "web" | "fb" | "system";
};

const DEGRADED_REPLY =
  "I'm offline for a minute — my brain isn't wired up. Drop your email and I'll text you when I'm back, " +
  "or check back in a few minutes.";

/** Resolve the configured LLM model. */
function resolveModel(): LanguageModel {
  if (botConfig.provider === "anthropic") {
    return anthropic(botConfig.defaultModel);
  }
  // ollama or openai-compatible — both use the same OpenAI-compatible chat
  // completions protocol. Ollama serves /v1 with a dummy API key.
  const provider = createOpenAICompatible({
    name: botConfig.provider === "ollama" ? "ollama" : "openai-compatible",
    baseURL: botConfig.ollamaBaseUrl,
    apiKey: botConfig.ollamaApiKey,
  });
  return provider(botConfig.ollamaModel);
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function streamScout(
  args: StreamArgs
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  if (!botEnabled()) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse("token", { text: DEGRADED_REPLY })));
        controller.enqueue(encoder.encode(sse("done", { mode: "marketing", degraded: true })));
        controller.close();
      },
    });
  }

  const conv = await prisma.botConversation.findUnique({ where: { id: args.conversationId } });
  if (!conv) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse("error", { message: "conversation_not_found" })));
        controller.close();
      },
    });
  }

  await appendMessage({ conversationId: conv.id, role: "user", content: args.userMessage });

  const cookieUser = await getCurrentUser();
  const hasSession = !!cookieUser && cookieUser.status === "active";

  const mode = detectMode(args.userMessage, conv.mode as "marketing" | "support" | "handoff");
  if (mode !== conv.mode) await setMode(conv.id, mode);

  const recent = await prisma.botMessage.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "desc" },
    take: botConfig.contextWindowMessages,
  });
  const history: ModelMessage[] = recent.reverse().map((m) => {
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "assistant") return { role: "assistant", content: m.content };
    if (m.role === "tool") {
      return {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: m.toolCallId,
            toolName: m.toolName,
            output: { type: "text", value: m.content },
          },
        ],
      };
    }
    return { role: "user", content: m.content };
  });

  const system = buildSystemPrompt({
    mode,
    userEmail: cookieUser?.email ?? null,
    hasSession,
    currentDate: new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
  });

  const ctx = {
    conversationId: conv.id,
    mode,
    userEmail: cookieUser?.email ?? null,
    hasSession,
    channel: args.channel,
  };
  const tools = buildTools(ctx);

  // We start the stream as a Promise from streamText and pipe events.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = streamText({
          model: resolveModel(),
          system,
          messages: history,
          tools,
          stopWhen: ({ steps }) => steps.length >= 6,
          onError: ({ error }) => {
            // eslint-disable-next-line no-console
            console.error("[scout:stream] error:", error);
            controller.enqueue(encoder.encode(sse("error", { message: String(error) })));
          },
        });

        let assembledReply = "";
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            const text = part.text;
            assembledReply += text;
            controller.enqueue(encoder.encode(sse("token", { text })));
          } else if (part.type === "tool-result") {
            controller.enqueue(
              encoder.encode(
                sse("tool", {
                  name: part.toolName,
                  // The result output shape varies; stringify safely.
                  result: stringifySafe(part.output),
                })
              )
            );
          } else if (part.type === "error") {
            controller.enqueue(encoder.encode(sse("error", { message: String(part.error) })));
          }
          // Other part types (start, finish-step, tool-call, etc.) — silently observed.
        }

        // Persist assistant reply.
        const finalReply = assembledReply.trim() || "Hmm, I lost my train of thought — try again?";
        await appendMessage({ conversationId: conv.id, role: "assistant", content: finalReply });

        // Did the bot escalate to handoff?
        const steps = await result.steps;
        const calledHandoff = (steps ?? []).some((s) =>
          s.toolCalls?.some((tc) => tc.toolName === "handoff_to_human")
        );
        if (calledHandoff && mode !== "handoff") await setMode(conv.id, "handoff");

        controller.enqueue(encoder.encode(sse("done", { mode, degraded: false })));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error("[scout:stream] caught:", msg);
        controller.enqueue(encoder.encode(sse("error", { message: msg })));
        controller.enqueue(encoder.encode(sse("done", { mode, degraded: true })));
        controller.close();
      }
    },
  });

  return stream;
}

function detectMode(
  message: string,
  current: "marketing" | "support" | "handoff"
): "marketing" | "support" | "handoff" {
  if (current === "handoff") return "handoff";
  const m = message.toLowerCase();
  const supportSignals = [
    "my account", "my sale", "my listing", "my reservation",
    "i forgot my password", "reset my password", "sign in",
    "i can't log", "cancel my", "refund", "delete my",
    "my order", "where is my", "support",
  ];
  return supportSignals.some((s) => m.includes(s)) ? "support" : "marketing";
}

function stringifySafe(value: unknown): unknown {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}