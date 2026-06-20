"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ScrollText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ExternalLink,
  X,
  Shield,
  User,
  Settings,
  Package,
  MessageSquare,
  LogIn,
  LogOut,
} from "lucide-react";

type LogRow = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: string;
  ip: string;
  createdAt: string;
};

type AuditResponse = {
  rows: LogRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: { actions: { action: string; count: number }[]; actors: { actor: string; count: number }[] };
};

const actionMeta: Record<string, { label: string; tone: "brand" | "success" | "warning" | "error" | "info" | "neutral"; icon: React.ElementType }> = {
  "sale.verify":       { label: "Verified",   tone: "success", icon: Shield },
  "sale.unverify":     { label: "Unverified", tone: "warning", icon: Shield },
  "sale.update":       { label: "Sale updated", tone: "info", icon: Package },
  "sale.delete":       { label: "Sale deleted", tone: "error", icon: Package },
  "sale.bulk_verify":  { label: "Bulk verify", tone: "success", icon: Shield },
  "user.view":         { label: "User viewed", tone: "info", icon: User },
  "message.read":      { label: "Message read", tone: "info", icon: MessageSquare },
  "settings.update":   { label: "Settings updated", tone: "neutral", icon: Settings },
  "admin.login":       { label: "Login",      tone: "brand", icon: LogIn },
  "admin.logout":      { label: "Logout",     tone: "neutral", icon: LogOut },
};

const toneBadge: Record<string, string> = {
  brand:   "badge-brand",
  success: "badge-success",
  warning: "badge-warning",
  error:   "badge-error",
  info:    "badge-info",
  neutral: "badge-neutral",
};

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LogRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("actor", q);
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      // surface as empty
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [q, action, actor, page]);

  useEffect(() => {
    const t = setTimeout(fetchData, 200);
    return () => clearTimeout(t);
  }, [fetchData]);

  const reset = () => {
    setQ("");
    setAction("");
    setActor("");
    setPage(1);
  };

  const selectedMeta = useMemo(() => {
    if (!selected) return null;
    try {
      return JSON.parse(selected.metadata) as Record<string, unknown>;
    } catch {
      return { raw: selected.metadata };
    }
  }, [selected]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Compliance</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Audit log</h2>
          <p className="mt-1 text-sm text-surface-600">
            {data ? `${data.total.toLocaleString()} events` : "Loading…"} · every operator action is recorded
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              placeholder="Search by actor…"
              aria-label="Search audit log"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="input input-sm pl-9"
            />
          </div>

          <select
            aria-label="Filter by action"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="input input-sm max-w-[180px]"
          >
            <option value="">All actions</option>
            {data?.facets.actions.map((a) => (
              <option key={a.action} value={a.action}>
                {actionMeta[a.action]?.label || a.action} ({a.count})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by actor"
            value={actor}
            onChange={(e) => { setActor(e.target.value); setPage(1); }}
            className="input input-sm max-w-[180px]"
          >
            <option value="">All actors</option>
            {data?.facets.actors.map((a) => (
              <option key={a.actor} value={a.actor}>
                {a.actor} ({a.count})
              </option>
            ))}
          </select>

          {(q || action || actor) && (
            <button
              type="button"
              onClick={reset}
              className="btn btn-ghost btn-sm"
              aria-label="Clear filters"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-surface-300" />
            <h3 className="mt-3 text-sm font-semibold text-surface-900">No audit events</h3>
            <p className="mt-1 text-sm text-surface-500">
              {q || action || actor ? "Adjust filters." : "No actions have been logged yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Target</th>
                  <th>IP</th>
                  <th className="text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const meta = actionMeta[row.action] || {
                    label: row.action,
                    tone: "neutral" as const,
                    icon: ScrollText,
                  };
                  const Icon = meta.icon;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer"
                    >
                      <td>
                        <span className={`badge ${toneBadge[meta.tone]}`}>
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="font-medium text-surface-900">{row.actor}</td>
                      <td className="text-surface-700">{row.entity}</td>
                      <td className="font-mono text-xs text-surface-600">
                        {row.entityId || "—"}
                      </td>
                      <td className="font-mono text-xs text-surface-500">{row.ip || "—"}</td>
                      <td className="text-right text-xs text-surface-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 px-4 py-3">
            <p className="text-xs text-surface-600">
              Page <span className="font-semibold text-surface-900">{data.page}</span> of {data.pageCount}
              {" · "}
              {data.total.toLocaleString()} events
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pageCount, p + 1))}
                disabled={page === data.pageCount}
                className="btn btn-secondary btn-sm"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-surface-900/40"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-surface-0 shadow-elevated animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-surface-200 px-5 py-4">
              <div>
                <p className="eyebrow">Audit detail</p>
                <h3
                  id="audit-detail-title"
                  className="mt-0.5 font-display text-base font-bold text-surface-900"
                >
                  {actionMeta[selected.action]?.label || selected.action}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md p-1.5 text-surface-500 hover:bg-surface-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto scroll-y p-5">
              <dl className="space-y-3 text-sm">
                <DetailRow label="Action" value={selected.action} mono />
                <DetailRow label="Actor" value={selected.actor} />
                <DetailRow label="Entity" value={selected.entity} />
                <DetailRow label="Entity ID" value={selected.entityId || "—"} mono />
                <DetailRow label="IP address" value={selected.ip || "—"} mono />
                <DetailRow label="Timestamp" value={new Date(selected.createdAt).toLocaleString()} />
              </dl>

              <div className="mt-6">
                <p className="eyebrow">Metadata</p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-800">
                  {JSON.stringify(selectedMeta, null, 2)}
                </pre>
              </div>

              {selected.entityId && (selected.entity === "sale" || selected.entityId.length > 6) && (
                <a
                  href={`/admin/sales/${selected.entityId}`}
                  className="btn btn-secondary btn-sm mt-6"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  View target
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-surface-500">
        {label}
      </dt>
      <dd className={`text-right text-surface-900 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
