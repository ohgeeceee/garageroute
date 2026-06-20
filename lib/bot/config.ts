/**
 * Scout configuration.
 *
 * All env-driven. When the configured provider isn't reachable, the bot
 * gracefully degrades (returns canned "I'm offline" replies) so the rest
 * of the app keeps working.
 *
 * Provider switch (SCOUT_PROVIDER):
 *   - "ollama"            -> local Ollama server (default; free, private)
 *   - "openai-compatible" -> any other OpenAI-compatible endpoint (LM Studio, vLLM, etc.)
 *   - "anthropic"         -> Anthropic Claude (paid, best quality)
 *
 * For local-only setups, just leave SCOUT_PROVIDER=ollama (the default) and
 * make sure Ollama is running with the model pulled. No API key required.
 */

export const BOT_NAME = "Scout";

export type ScoutProvider = "ollama" | "openai-compatible" | "anthropic";

function readProvider(): ScoutProvider {
  const raw = (process.env.SCOUT_PROVIDER || "ollama").toLowerCase();
  if (raw === "anthropic" || raw === "ollama" || raw === "openai-compatible") return raw;
  return "ollama";
}

export const botConfig = {
  /** Which provider to use. Default "ollama" (local). */
  provider: readProvider(),
  /** Anthropic API key. Required when provider=anthropic. */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  /** Anthropic models. */
  defaultModel: process.env.SCOUT_MODEL || "claude-haiku-4-5",
  escalationModel: process.env.SCOUT_ESCALATION_MODEL || "claude-sonnet-4-5",

  /** Ollama / OpenAI-compatible endpoint. */
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
  /** Default model name to request from Ollama. */
  ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5:7b",
  /** Optional API key for OpenAI-compatible providers that need one (LM Studio, etc.). */
  ollamaApiKey: process.env.OLLAMA_API_KEY || "ollama",

  /** Resend API key. When unset, emails are queued to PendingEmail instead. */
  resendApiKey: process.env.RESEND_API_KEY || "",
  /** From address, e.g. "Scout <scout@garageroute.com>". */
  fromEmail: process.env.SCOUT_FROM_EMAIL || "Scout <scout@garageroute.com>",
  /** Base URL for magic links. Defaults to NEXT_PUBLIC_APP_URL. */
  publicBaseUrl:
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  /** FB Messenger creds. When PAGE_ACCESS_TOKEN unset, FB webhook returns 503. */
  fb: {
    pageId: process.env.FB_PAGE_ID || "",
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || "",
    verifyToken: process.env.FB_VERIFY_TOKEN || "garageroute-scout-verify",
  },
  /** Magic link TTL (ms). Default 15 min. */
  magicLinkTtlMs: 15 * 60 * 1000,
  /** Max messages kept in the in-conversation summary window. */
  contextWindowMessages: 20,
  /** How many messages before suggesting handoff to a human. */
  handoffAfterMessages: 12,
};

/**
 * The bot is "enabled" if the configured provider is plausibly reachable.
 * For local providers we optimistically return true — the actual call will
 * fail with a clear error if Ollama isn't running, and the runner will
 * surface a degraded reply.
 */
export function botEnabled(): boolean {
  if (botConfig.provider === "anthropic") return Boolean(botConfig.anthropicApiKey);
  if (botConfig.provider === "ollama") return Boolean(botConfig.ollamaBaseUrl);
  return Boolean(botConfig.ollamaBaseUrl);
}

export function emailEnabled(): boolean {
  return Boolean(botConfig.resendApiKey);
}

export function messengerEnabled(): boolean {
  return Boolean(botConfig.fb.pageAccessToken && botConfig.fb.pageId);
}