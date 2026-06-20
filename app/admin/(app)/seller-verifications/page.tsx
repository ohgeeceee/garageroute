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
  ShieldOff,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
} from "lucide-react";

type Row = {
  id: string;
  status: string;
  notes: string;
  documentUrl: string;
  documentPath: string;
  documentName: string;
  documentMime: string;
  documentBytes: number;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string;
  user: { id: string; name: string; email: string; city: string; state: string; createdAt: string };
};

function formatBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function SellerVerificationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
      setToast({ kind: "ok", msg: status === "approved" ? "Approved — seller can now post sales." : "Rejected." });
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
          Review ID documents and approve sellers to unlock the verified badge.
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
            const hasUpload = !!r.documentPath;
            const isOpen = expanded[r.id];
            const isImage = r.documentMime.startsWith("image/");
            const isPdf = r.documentMime === "application/pdf";
            return (
              <li key={r.id} className="card overflow-hidden">
                <div className="grid gap-4 p-5 md:grid-cols-[1fr_300px]">
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

                    {/* Document viewer */}
                    {hasUpload ? (
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">ID document</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))}
                              className="text-xs font-semibold text-brand-700 hover:underline"
                            >
                              {isOpen ? "Hide" : "View"} →
                            </button>
                            <a
                              href={`/api/admin/verifications/sellers/${r.id}/document`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-surface-200 px-2 py-1 text-xs font-semibold text-surface-700 hover:bg-surface-50"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <a
                              href={`/api/admin/verifications/sellers/${r.id}/document`}
                              download={r.documentName}
                              className="inline-flex items-center gap-1 rounded-md border border-surface-200 px-2 py-1 text-xs font-semibold text-surface-700 hover:bg-surface-50"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-xs">
                          {isImage ? <ImageIcon className="h-4 w-4 text-surface-500" /> : <FileText className="h-4 w-4 text-surface-500" />}
                          <span className="truncate font-medium text-surface-800">{r.documentName}</span>
                          <span className="ml-auto text-surface-500">{r.documentMime} · {formatBytes(r.documentBytes)}</span>
                        </div>
                        {isOpen && (
                          <div className="mt-2 overflow-hidden rounded-lg border border-surface-200 bg-surface-100">
                            {isImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/admin/verifications/sellers/${r.id}/document`}
                                alt={`ID for ${r.user.name}`}
                                className="max-h-[480px] w-full object-contain"
                              />
                            ) : isPdf ? (
                              <iframe
                                src={`/api/admin/verifications/sellers/${r.id}/document`}
                                className="h-[480px] w-full"
                                title={`ID document for ${r.user.name}`}
                              />
                            ) : (
                              <div className="p-6 text-center text-sm text-surface-500">
                                Preview unavailable. <a href={`/api/admin/verifications/sellers/${r.id}/document`} className="font-semibold text-brand-700 hover:underline">Download</a> to view.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : r.documentUrl ? (
                      <p className="mt-3 text-xs">
                        <a href={r.documentUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline inline-flex items-center gap-1">
                          View submitted document <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    ) : (
                      <p className="mt-3 text-xs italic text-warning-700">No document attached — review notes only.</p>
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
                        <ShieldOff className="h-4 w-4" />
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
