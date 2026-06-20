"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Inbox as InboxIcon,
  Search,
  Archive,
  CheckCircle2,
  MailOpen,
  ArrowRight,
} from "lucide-react";

type ThreadRow = {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  status: string;
  lastMessageAt: string;
  lastSnippet: string;
  lastDirection: string;
  lastReadAt: string | null;
  _count: { messages: number };
};

type Counts = {
  open: number;
  closed: number;
  archived: number;
  unreadOpen: number;
};

const TABS = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminInboxPage() {
  const [tab, setTab] = useState<TabKey>("open");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const sp = new URLSearchParams();
    sp.set("status", tab);
    if (q) sp.set("q", q);
    fetch(`/api/admin/inbox?${sp.toString()}`)
      .then((r) => (r.ok ? r.json() : { threads: [], counts: null }))
      .then((d) => {
        if (cancelled) return;
        setRows(d.threads || []);
        setCounts(d.counts || null);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Communications</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">
            Email Inbox
          </h2>
          <p className="mt-1 text-sm text-surface-600">
            Replies to <code className="font-mono text-surface-700">admin@garageroute.com</code>.
          </p>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 px-4 py-3">
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === t.key
                    ? "bg-brand-100 text-brand-700"
                    : "text-surface-600 hover:bg-surface-100"
                }`}
              >
                {t.label}
                {counts && (
                  <span className="ml-1.5 text-[10px] font-semibold text-surface-500">
                    {t.key === "open"
                      ? counts.open
                      : t.key === "closed"
                      ? counts.closed
                      : t.key === "archived"
                      ? counts.archived
                      : counts.open + counts.closed + counts.archived}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subject, email, snippet…"
              className="input input-sm pl-9"
              aria-label="Search inbox"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <InboxIcon className="h-10 w-10 text-surface-300" />
            <h3 className="mt-3 text-sm font-semibold text-surface-900">Inbox empty</h3>
            <p className="mt-1 text-sm text-surface-500">
              {q
                ? "Nothing matches that search."
                : tab === "open"
                ? "No open threads. Customer replies will land here automatically."
                : `No ${tab} threads.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {rows.map((t) => (
              <ThreadRowItem key={t.id} row={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ThreadRowItem({ row }: { row: ThreadRow }) {
  const isUnread = !row.lastReadAt && row.status === "open";
  const isInbound = row.lastDirection === "inbound";

  return (
    <li>
      <Link
        href={`/admin/inbox/${row.id}`}
        className="flex items-start gap-4 px-5 py-4 transition hover:bg-surface-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
          {initial(row.fromName || row.fromEmail)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={`truncate text-sm ${
                isUnread ? "font-bold text-surface-900" : "font-semibold text-surface-800"
              }`}
            >
              {row.fromName || row.fromEmail}
            </p>
            {row.fromName && (
              <span className="truncate text-xs font-normal text-surface-500">
                {row.fromEmail}
              </span>
            )}
            {isUnread && (
              <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
            )}
            {row.status !== "open" && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  row.status === "closed"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-surface-200 text-surface-600"
                }`}
              >
                {row.status === "closed" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Archive className="h-3 w-3" />
                )}
                {row.status}
              </span>
            )}
          </div>

          <p
            className={`mt-0.5 truncate text-sm ${
              isUnread ? "font-semibold text-surface-900" : "text-surface-700"
            }`}
          >
            {row.subject}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-surface-500">
            {row.lastSnippet || "(no preview)"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-surface-500">{relTime(row.lastMessageAt)}</span>
          <span className="text-[10px] font-medium text-surface-400">
            {row._count.messages} {row._count.messages === 1 ? "msg" : "msgs"}
          </span>
          {isInbound ? (
            <MailOpen className="h-3 w-3 text-surface-400" />
          ) : (
            <ArrowRight className="h-3 w-3 text-surface-400" />
          )}
        </div>
      </Link>
    </li>
  );
}

function initial(s: string): string {
  const c = (s || "").trim();
  return (c[0] || "?").toUpperCase();
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}