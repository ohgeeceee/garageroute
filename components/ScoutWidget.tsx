"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScoutWidget — the floating chat bubble + chat panel.
 *
 *  - Loads config from /api/bot/widget-config on mount
 *  - Persists a stable externalId in localStorage so context survives reloads
 *  - Streams replies via fetch + ReadableStream (text/event-stream)
 *  - Renders markdown-lite (links, line breaks, **bold**, *italic*)
 *  - Auto-opens a greeting once per session (configurable)
 *
 * This component is rendered by the root layout — it floats over every page.
 */

type WidgetConfig = {
  name: string;
  botOnline: boolean;
  greeting: string;
  placeholder: string;
  primaryColor: string;
  version: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
};

const STORAGE_KEY_ID = "scout.externalId";
const STORAGE_KEY_HISTORY = "scout.history.v1";
const STORAGE_KEY_OPENED = "scout.opened";

export default function ScoutWidget() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [externalId, setExternalId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load config + persistent id on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfgRes] = await Promise.all([
          fetch("/api/bot/widget-config", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setConfig(cfgRes);
      } catch {
        // Offline — widget still renders, just with placeholder text.
        setConfig({
          name: "Scout",
          botOnline: false,
          greeting: "I'm offline for a minute — try again shortly.",
          placeholder: "Type a message…",
          primaryColor: "#2563eb",
          version: 1,
        });
      }

      let id = localStorage.getItem(STORAGE_KEY_ID);
      if (!id) {
        id = `web-${crypto.randomUUID()}`;
        localStorage.setItem(STORAGE_KEY_ID, id);
      }
      setExternalId(id);

      // Restore history.
      try {
        const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (raw) {
          const restored = JSON.parse(raw) as ChatMessage[];
          if (Array.isArray(restored)) setMessages(restored.slice(-50));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-open greeting once per browser session.
  useEffect(() => {
    if (!config) return;
    if (sessionStorage.getItem(STORAGE_KEY_OPENED) === "1") return;
    sessionStorage.setItem(STORAGE_KEY_OPENED, "1");
    setOpen(true);
    if (messages.length === 0 && config.greeting) {
      setMessages([
        {
          id: `m-${Date.now()}-greet`,
          role: "assistant",
          content: config.greeting,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // Persist history.
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const trimmed = messages.slice(-50);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  // Focus input when opened.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !externalId) return;
    setInput("");
    setErrorBanner(null);

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}-u`,
      role: "user",
      content: text,
    };
    const assistantId = `m-${Date.now()}-a`;
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, placeholder]);
    setSending(true);

    try {
      const res = await fetch("/api/bot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          externalId,
          metadata: { url: window.location.pathname },
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const convId = res.headers.get("X-Conversation-Id");
      if (convId) setConversationId(convId);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("no stream");
      const decoder = new TextDecoder();
      let buf = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE events separated by \n\n.
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const lines = block.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) data += line.slice(6);
          }
          if (!data) continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (event === "token") {
            const tokenText = (parsed as { text?: string }).text || "";
            assembled += tokenText;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, content: assembled, streaming: true } : msg
              )
            );
          } else if (event === "done") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, streaming: false } : msg
              )
            );
          } else if (event === "error") {
            const msg = (parsed as { message?: string }).message || "unknown error";
            setErrorBanner(msg);
          }
        }
      }
      // Finalize if no done event arrived.
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId ? { ...msg, streaming: false } : msg
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                streaming: false,
                content:
                  msg.content ||
                  "Hmm, the connection dropped. Check your network or try again.",
              }
            : msg
        )
      );
      setErrorBanner(msg);
    } finally {
      setSending(false);
    }
  }

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    if (config?.greeting) {
      setMessages([{ id: `m-${Date.now()}-greet`, role: "assistant", content: config.greeting }]);
    }
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          aria-label={`Open ${config?.name ?? "Scout"} chat`}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 active:scale-95"
          style={{ backgroundColor: config?.primaryColor ?? "#2563eb" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={`${config?.name ?? "Scout"} chat`}
          className="fixed bottom-6 right-6 z-40 flex h-[min(640px,80vh)] w-[min(400px,calc(100vw-3rem))] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between rounded-t-2xl px-4 py-3 text-white"
            style={{ backgroundColor: config?.primaryColor ?? "#2563eb" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                S
              </div>
              <div>
                <div className="text-sm font-semibold">{config?.name ?? "Scout"}</div>
                <div className="text-xs opacity-80">
                  {config?.botOnline ? "Online" : "Offline — try later"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                aria-label="Clear chat history"
                className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
                title="Clear chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 text-sm"
          >
            {messages.length === 0 && (
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                {config?.botOnline ? "Loading…" : "Scout is offline. Try again later."}
              </div>
            )}
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            {errorBanner && (
              <div className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-200">
                {errorBanner}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={config?.placeholder ?? "Type a message…"}
              rows={1}
              className="flex-1 resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || !config?.botOnline}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
              style={{ backgroundColor: config?.primaryColor ?? "#2563eb" }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        {message.streaming && !message.content ? (
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        ) : (
          <MarkdownLite text={message.content} />
        )}
      </div>
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  // Minimal inline markdown: **bold**, *italic*, [text](url), line breaks.
  // Avoids dangerouslySetInnerHTML where possible.
  const segments: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push(...text.slice(last, match.index).split("\n").flatMap((line, i, arr) => {
        if (i < arr.length - 1) return [line, <br key={`br-${key++}`} />];
        return [line];
      }));
    }
    const tok = match[0];
    if (tok.startsWith("**")) {
      segments.push(<strong key={`s-${key++}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      segments.push(<em key={`e-${key++}`}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith("[")) {
      const linkMatch = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        segments.push(
          <a
            key={`a-${key++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    last = match.index + tok.length;
  }
  if (last < text.length) {
    segments.push(...text.slice(last).split("\n").flatMap((line, i, arr) => {
      if (i < arr.length - 1) return [line, <br key={`br-${key++}`} />];
      return [line];
    }));
  }
  return <>{segments}</>;
}