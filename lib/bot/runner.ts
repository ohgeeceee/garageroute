import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import { botConfig, botEnabled, BOT_NAME } from "./config";
import { buildSystemPrompt } from "./system";
import { buildTools } from "./tools";
import { appendMessage, getContext, patchContext, setMode } from "./conversation";
import { getCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

/**
 * Scout runner. Non-streaming variant — gives a single final reply
 * (with tool-call loop) plus a list of tool calls made. Used by:
 *  - /api/bot/fb (FB Messenger can't stream SSE to Meta)
 *  - widget "test mode" or fallback when streaming fails
 */

export type RunArgs = {
  conversationId: string;
  userMessage: string;
  channel: "web" | "fb" | "system";
};

export type RunResult = {
  ok: boolean;
  reply: string;
  toolCalls: { name: string; args: unknown; result: unknown }[];
  mode: "marketing" | "support" | "handoff";
  degraded: boolean;
};

const DEGRADED_REPLY =
  "I'm offline for a minute — my brain isn't wired up. Drop your email and I'll text you when I'm back, " +
  "or check back in a few minutes.";

/** Resolve the configured LLM model. */
function resolveModel(): LanguageModel {
  if (botConfig.provider === "anthropic") {
    return anthropic(botConfig.defaultModel);
  }
  const provider = createOpenAICompatible({
    name: botConfig.provider === "ollama" ? "ollama" : "openai-compatible",
    baseURL: botConfig.ollamaBaseUrl,
    apiKey: botConfig.ollamaApiKey,
  });
  return provider(botConfig.ollamaModel);
}

export async function runScout(args: RunArgs): Promise<RunResult> {
  if (!botEnabled()) {
    return { ok: false, reply: DEGRADED_REPLY, toolCalls: [], mode: "marketing", degraded: true };
  }

  const conv = await prisma.botConversation.findUnique({ where: { id: args.conversationId } });
  if (!conv) throw new Error("conversation not found");

  // Persist user message.
  await appendMessage({ conversationId: conv.id, role: "user", content: args.userMessage });

  // Mode detection — flip to support if the user asks about their account.
  const mode = detectMode(args.userMessage, conv.mode as "marketing" | "support" | "handoff");
  if (mode !== conv.mode) await setMode(conv.id, mode);

  const cookieUser = await getCurrentUser();
  const hasSession = !!cookieUser && cookieUser.status === "active";

  // Build recent message history (last 20) for context.
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

  try {
    const result = await generateText({
      model: resolveModel(),
      system,
      messages: history,
      tools,
      stopWhen: stepCountIs(6),
    });

    const reply = (result.text || "").trim() || "Hmm, I lost my train of thought — try again?";

    // Persist assistant message.
    await appendMessage({ conversationId: conv.id, role: "assistant", content: reply });

    // If the bot called handoff_to_human, switch mode.
    const calledHandoff = result.steps?.some((s) =>
      s.toolCalls?.some((tc) => tc.toolName === "handoff_to_human")
    );
    if (calledHandoff && mode !== "handoff") await setMode(conv.id, "handoff");

    const toolCalls = (result.steps ?? []).flatMap((s) =>
      (s.toolCalls ?? []).map((tc) => ({
        name: tc.toolName,
        args: tc.input,
        result: s.toolResults?.find((r) => r.toolCallId === tc.toolCallId)?.output ?? null,
      }))
    );

    return { ok: true, reply, toolCalls, mode, degraded: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
     
    console.error("[scout] run failed:", msg);
    return { ok: false, reply: DEGRADED_REPLY, toolCalls: [], mode, degraded: true };
  }
}

/** Quick intent detection: does this message look like an account-support ask? */
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