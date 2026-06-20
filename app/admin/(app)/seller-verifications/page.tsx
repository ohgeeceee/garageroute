"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  Clock,
  ShieldCheck,
} from "lucide-react";

type Row = {
  id: string;
  status: string;
  notes: string;
  documentUrl: string;
  submittedAt: string;
  user: { id: string; name: string; email: string; city: string; state: string; createdAt: string };
};

export default function SellerVerificationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verifications/sellers");
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      setToast({ kind: "err", msg: "Failed to load." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    setToast(null);
    try {
      const res = await fetch("/api/admin/verifications/sellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes: reasons[id] || "" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed.");
      setToast({ kind: "ok", msg: status === "approved" ? "Approved — user can now post sales." : "Rejected." });
      await load();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-900">
        <ArrowLeft className="h-4 w-4" /> Users
      </Link>

      <header>
        <p className="eyebrow">Trust &amp; Safety</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Seller verification queue</h2>
        <p className="mt-1 text-sm text-surface-600">
          Approve sellers to let them post sales and unlock the verified badge.
        </p>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-surface-900">Inbox zero — queue is clear</h3>
          <p className="mt-1 text-sm text-surface-500">New applications appear here within seconds of submission.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const isBusy = busyId === r.id;
            const submittedAgo = relativeTime(r.submittedAt);
            return (
              <li key={r.id} className="card overflow-hidden">
                <div className="grid gap-4 p-5 md:grid-cols-[1fr_280px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-surface-900">{r.user.name}</h3>
                      <span className="badge badge-info"><Clock className="h-3 w-3" /> Pending</span>
                    </div>
                    <p className="mt-0.5 text-sm text-surface-600">{r.user.email}</p>
                    <p className="mt-0.5 text-xs text-surface-500">
                      {r.user.city}{r.user.city && r.user.state ? ", " : ""}{r.user.state} · joined {new Date(r.user.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-surface-800">{r.notes || <em className="text-surface-400">No notes provided.</em>}</p>
                    </div>
                    {r.documentUrl && (
                      <p className="mt-2 text-xs">
                        <a href={r.documentUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">
                          View submitted document →
                        </a>
                      </p>
                    )}
                    <p className="mt-3 text-xs text-surface-500">Submitted {submittedAgo}</p>
                  </div>

                  <div className="space-y-2 md:border-l md:border-surface-200 md:pl-4">
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder="Reason (sent to user on reject)"
                      value={reasons[r.id] || ""}
                      onChange={(e) => setReasons((p) => ({ ...p, [r.id]: e.target.value }))}
                      className="input text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => decide(r.id, "approved")} disabled={isBusy} className="btn btn-primary flex-1">
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Approve
                      </button>
                      <button onClick={() => decide(r.id, "rejected")} disabled={isBusy} className="btn btn-danger flex-1">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 shadow-lg animate-fade-in ${
            toast.kind === "ok" ? "border-success-200 bg-success-50 text-success-700" : "border-error-200 bg-error-50 text-error-700"
          }`}
        >
          <p className="text-sm font-semibold">{toast.msg}</p>
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
