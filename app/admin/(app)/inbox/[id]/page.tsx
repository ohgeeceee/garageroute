"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Send,
  CheckCircle2,
  Archive,
  Inbox as InboxIcon,
  ChevronDown,
} from "lucide-react";

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  fromAddress: string;
  fromName: string;
  toAddress: string;
  toName: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  status: string;
  createdAt: string;
};

type Thread = {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  status: "open" | "closed" | "archived";
  lastMessageAt: string;
  createdAt: string;
  messages: Message[];
};

export default function AdminInboxThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [updatedStatus, setUpdatedStatus] = useState<Thread["status"] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/inbox/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setThread(d);
      })
      .catch(() => {
        if (!cancelled) setThread(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    // Auto-scroll to the bottom of the conversation on load / new messages.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.messages.length]);

  const send = async () => {
    if (!thread || !reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/inbox/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setError(data.error || `Send failed (${r.status})`);
        return;
      }
      setReply("");
      // Refresh thread.
      const fresh = await fetch(`/api/admin/inbox/${id}`).then((r) => r.json());
      setThread(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: Thread["status"]) => {
    setStatusMenuOpen(false);
    const r = await fetch(`/api/admin/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      setUpdatedStatus(status);
      if (thread) setThread({ ...thread, status });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="card p-10 text-center">
        <InboxIcon className="mx-auto h-10 w-10 text-surface-300" />
        <h3 className="mt-3 text-sm font-semibold text-surface-900">Thread not found</h3>
        <Link href="/admin/inbox" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          Back to inbox
        </Link>
      </div>
    );
  }

  const effectiveStatus = updatedStatus ?? thread.status;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/inbox"
            className="rounded-md p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs text-surface-500">
              {thread.fromName || thread.fromEmail}
            </p>
            <h2 className="truncate text-lg font-bold tracking-tight text-surface-900">
              {thread.subject}
            </h2>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setStatusMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-surface-200 bg-surface-0 px-3 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50"
          >
            {effectiveStatus === "open" && (
              <>
                <Mail className="h-3.5 w-3.5" /> Open
              </>
            )}
            {effectiveStatus === "closed" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" /> Closed
              </>
            )}
            {effectiveStatus === "archived" && (
              <>
                <Archive className="h-3.5 w-3.5 text-surface-500" /> Archived
              </>
            )}
            <ChevronDown className="h-3 w-3" />
          </button>
          {statusMenuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-surface-200 bg-surface-0 shadow-lg">
              {(["open", "closed", "archived"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`block w-full px-3 py-2 text-left text-xs hover:bg-surface-50 ${
                    effectiveStatus === s ? "font-semibold text-brand-700" : "text-surface-700"
                  }`}
                >
                  {s === "open" ? "Open" : s === "closed" ? "Closed" : "Archived"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="card overflow-hidden">
        <div
          ref={scrollRef}
          className="max-h-[60vh] space-y-3 overflow-y-auto p-5"
        >
          {thread.messages.length === 0 ? (
            <p className="text-sm text-surface-500">No messages yet.</p>
          ) : (
            thread.messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))
          )}
        </div>

        {/* Reply composer */}
        {effectiveStatus !== "archived" && (
          <div className="border-t border-surface-100 bg-surface-50/40 p-4">
            <label className="text-xs font-medium text-surface-700">
              Reply to {thread.fromName || thread.fromEmail}
            </label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write your reply… (⌘ + Enter to send)"
              rows={4}
              className="mt-1 w-full rounded-md border border-surface-200 bg-surface-0 p-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-surface-500">
                Replies send from <code className="font-mono">admin@garageroute.com</code>.
              </p>
              <button
                onClick={send}
                disabled={sending || !reply.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {sending ? "Sending…" : "Send reply"}
              </button>
            </div>
            {error && (
              <p className="mt-2 rounded-md bg-error-50 px-3 py-2 text-xs text-error-700">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";
  const initials = ((message.fromName || message.fromAddress)[0] || "?").toUpperCase();
  const time = new Date(message.createdAt);

  return (
    <div className={`flex gap-3 ${isOutbound ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isOutbound
            ? "bg-brand-600 text-white"
            : "bg-surface-200 text-surface-700"
        }`}
      >
        {initials}
      </div>
      <div className={`min-w-0 max-w-[80%] ${isOutbound ? "text-right" : ""}`}>
        <div className="mb-0.5 flex items-baseline gap-2 text-[11px] text-surface-500">
          <span className="font-medium text-surface-700">
            {isOutbound
              ? "You (admin@garageroute.com)"
              : message.fromName
              ? `${message.fromName} <${message.fromAddress}>`
              : message.fromAddress}
          </span>
          <span>•</span>
          <span title={time.toISOString()}>{time.toLocaleString()}</span>
          {message.status === "failed" && (
            <span className="font-semibold text-error-600">failed</span>
          )}
          {message.status === "bounced" && (
            <span className="font-semibold text-amber-600">bounced</span>
          )}
        </div>
        <div
          className={`whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isOutbound
              ? "bg-brand-50 text-surface-900 ring-1 ring-brand-100"
              : "bg-surface-0 text-surface-900 ring-1 ring-surface-200"
          }`}
        >
          {message.bodyText || "(no body)"}
        </div>
      </div>
    </div>
  );
}