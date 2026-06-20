"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Download,
  ShieldCheck,
  ShieldOff,
  X,
  Inbox,
} from "lucide-react";

type SaleRow = {
  id: string;
  title: string;
  seller: string;
  city: string;
  state: string;
  zip: string;
  dates: string;
  type: string;
  verified: boolean;
  donationStatus: string;
  createdAt: string;
  _count: { items: number; queues: number; messages: number; reservations: number };
};

type SalesResponse = {
  rows: SaleRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

type StatusFilter = "all" | "verified" | "pending";

export default function AdminSalesPage() {
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/sales?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      setData(json);
      setSelected(new Set());
    } catch {
      setToast({ kind: "err", msg: "Failed to load sales." });
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(fetchData, 200);
    return () => clearTimeout(t);
  }, [fetchData]);

  const allOnPageSelected = useMemo(
    () => !!data && data.rows.length > 0 && data.rows.every((r) => selected.has(r.id)),
    [data, selected]
  );

  const toggleAll = () => {
    if (!data) return;
    if (allOnPageSelected) setSelected(new Set());
    else setSelected(new Set(data.rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkVerify = async (verified: boolean) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), verified }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setToast({ kind: "ok", msg: `Updated ${json.updated} sale(s).` });
      await fetchData();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Operations</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Sales</h2>
          <p className="mt-1 text-sm text-surface-600">
            {data ? `${data.total.toLocaleString()} total` : "Loading…"} · search, filter, and verify listings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm" type="button" disabled>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <Link href="/post" target="_blank" className="btn btn-primary btn-sm">
            <Package className="h-4 w-4" />
            Create sale
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              placeholder="Search by title, seller, city, address, ZIP…"
              aria-label="Search sales"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="input input-sm pl-9"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-surface-200 bg-surface-0 p-0.5">
            {(["all", "verified", "pending"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatus(s); setPage(1); }}
                className={`rounded px-3 py-1 text-xs font-semibold capitalize transition ${
                  status === s
                    ? "bg-brand-600 text-white"
                    : "text-surface-600 hover:bg-surface-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2">
            <p className="text-sm font-semibold text-brand-800">
              {selected.size} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkVerify(true)}
                disabled={busy}
                className="btn btn-primary btn-sm"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verify selected
              </button>
              <button
                onClick={() => bulkVerify(false)}
                disabled={busy}
                className="btn btn-secondary btn-sm"
              >
                <ShieldOff className="h-4 w-4" />
                Unverify
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="btn btn-ghost btn-sm"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
            <h3 className="mt-3 text-sm font-semibold text-surface-900">No sales found</h3>
            <p className="mt-1 text-sm text-surface-500">
              {q ? `No results for "${q}".` : "Adjust filters or create your first sale."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      aria-label="Select all on page"
                      className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th>Sale</th>
                  <th>Seller</th>
                  <th>Location</th>
                  <th>Dates</th>
                  <th className="text-center">Items</th>
                  <th className="text-center">Inbox</th>
                  <th>Status</th>
                  <th className="text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((s) => (
                  <tr key={s.id} className={selected.has(s.id) ? "bg-brand-50/40" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleOne(s.id)}
                        aria-label={`Select ${s.title}`}
                        className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td>
                      <Link href={`/admin/sales/${s.id}`} className="font-semibold text-surface-900 hover:text-brand-700">
                        {s.title}
                      </Link>
                      <div className="text-xs text-surface-500">{s.type}</div>
                    </td>
                    <td className="text-surface-700">{s.seller}</td>
                    <td className="text-surface-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-surface-400" />
                        {s.city}, {s.state} {s.zip}
                      </div>
                    </td>
                    <td className="text-surface-700 whitespace-nowrap">{s.dates || "—"}</td>
                    <td className="text-center font-semibold text-surface-800">
                      {s._count.items}
                    </td>
                    <td className="text-center text-surface-600">
                      {s._count.messages + s._count.queues + s._count.reservations}
                    </td>
                    <td>
                      {s.verified ? (
                        <span className="badge badge-success">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="text-right text-xs text-surface-500 whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 px-4 py-3">
            <p className="text-xs text-surface-600">
              Page <span className="font-semibold text-surface-900">{data.page}</span> of {data.pageCount}
              {" · "}
              {data.total.toLocaleString()} results
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

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 shadow-lg animate-fade-in ${
            toast.kind === "ok"
              ? "border-success-200 bg-success-50 text-success-700"
              : "border-error-200 bg-error-50 text-error-700"
          }`}
        >
          <p className="text-sm font-semibold">{toast.msg}</p>
        </div>
      )}
    </div>
  );
}
