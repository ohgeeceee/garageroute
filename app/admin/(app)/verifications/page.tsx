"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  MapPin,
  Calendar,
  Package,
  Clock,
  ShieldCheck,
  ShieldOff,
  Building2,
} from "lucide-react";

type Verification = {
  id: string;
  title: string;
  seller: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dates: string;
  hours: string;
  description: string;
  photos: string[];
  createdAt: string;
  _count: { items: number };
};

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verifications");
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const json = await res.json();
      setItems(json);
    } catch {
      setToast({ kind: "err", msg: "Failed to load queue." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const decide = async (id: string, verified: boolean) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/sales/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.filter((v) => v.id !== id));
      setToast({ kind: "ok", msg: verified ? "Sale verified." : "Verification removed." });
    } catch {
      setToast({ kind: "err", msg: "Action failed." });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Trust &amp; Safety</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">
            Verification queue
          </h2>
          <p className="mt-1 text-sm text-surface-600">
            Review unverified listings and approve or reject them.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-md bg-warning-50 px-3 py-1.5 font-semibold text-warning-700 border border-warning-100">
            <Clock className="h-4 w-4" />
            {loading ? "…" : items.length} pending
          </span>
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-surface-900">
            Inbox zero — queue is clear
          </h3>
          <p className="mt-1 text-sm text-surface-500 max-w-sm">
            All listings have been reviewed. New submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((v) => {
            const photo = v.photos?.[0];
            const isBusy = busyId === v.id;
            return (
              <li key={v.id} className="card overflow-hidden">
                <div className="grid gap-0 md:grid-cols-[200px_1fr_auto]">
                  {/* Photo */}
                  <div className="bg-surface-100 md:min-h-[160px]">
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        aria-hidden="true"
                        className="h-48 w-full object-cover md:h-full"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center text-surface-400 md:h-full">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-surface-900">{v.title}</h3>
                        <p className="mt-0.5 text-sm text-surface-600">
                          by <span className="font-medium text-surface-800">{v.seller}</span>
                        </p>
                      </div>
                      <span className="badge badge-warning whitespace-nowrap">
                        <Clock className="h-3 w-3" /> Awaiting review
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-surface-400" />
                        {v.address}, {v.city}, {v.state} {v.zip}
                      </span>
                      {v.dates && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-surface-400" />
                          {v.dates}
                          {v.hours ? ` · ${v.hours}` : ""}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-surface-400" />
                        {v._count.items} items
                      </span>
                    </div>

                    {v.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-surface-700">
                        {v.description}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-surface-500">
                      Submitted {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row gap-2 border-t border-surface-200 p-4 md:flex-col md:border-l md:border-t-0 md:justify-center">
                    <button
                      onClick={() => decide(v.id, true)}
                      disabled={isBusy}
                      className="btn btn-primary flex-1 md:flex-none"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Verify
                    </button>
                    <button
                      onClick={() => decide(v.id, false)}
                      disabled={isBusy}
                      className="btn btn-secondary flex-1 md:flex-none"
                    >
                      <ShieldOff className="h-4 w-4" />
                      Reject
                    </button>
                    <Link
                      href={`/admin/sales/${v.id}`}
                      className="btn btn-ghost flex-1 md:flex-none"
                    >
                      View details
                    </Link>
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
