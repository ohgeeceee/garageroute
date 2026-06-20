"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

type Item = {
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
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

export default function VerifyPage() {
  const [me, setMe] = useState<{ id: string; verifiedSeller: boolean; name: string; email: string } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [meRes, verRes] = await Promise.all([
      fetch("/api/account/me").then((r) => r.json()),
      fetch("/api/account/verify").then((r) => r.json()),
    ]);
    setMe(meRes.user);
    setItems(verRes.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>;
  if (!me) return null;

  if (me.verifiedSeller) {
    return (
      <div className="space-y-6">
        <header>
          <p className="eyebrow">Verification</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">You&apos;re a verified seller</h1>
        </header>
        <div className="card flex items-center gap-3 border-success-200 bg-success-50 p-5">
          <CheckCircle2 className="h-6 w-6 text-success-700" />
          <div>
            <p className="font-semibold text-success-800">Approved</p>
            <p className="text-sm text-success-700">Your listings show the verified badge.</p>
          </div>
        </div>
        {items.length > 0 && <History items={items} />}
      </div>
    );
  }

  const pending = items.find((i) => i.status === "pending");
  const rejected = items.find((i) => i.status === "rejected");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !notes.trim()) {
      setToast({ kind: "err", msg: "Upload an ID or add notes describing your sales." });
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      const form = new FormData();
      form.append("notes", notes);
      if (file) form.append("document", file);
      const res = await fetch("/api/account/verify", {
        method: "POST",
        body: form,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Submission failed.");
      setToast({ kind: "ok", msg: "Submitted. We'll review within 24 hours." });
      setNotes("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Verification</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Become a verified seller</h1>
        <p className="mt-1 text-sm text-surface-600">
          Upload a government-issued ID and tell us about your typical sales. Reviews usually take 24 hours.
        </p>
      </header>

      {pending && (
        <div className="card flex items-center gap-3 border-info-200 bg-info-50 p-5">
          <Clock className="h-6 w-6 text-info-700" />
          <div>
            <p className="font-semibold text-info-800">Submission in review</p>
            <p className="text-sm text-info-700">
              Submitted {new Date(pending.submittedAt).toLocaleString()}. We&apos;ll email you at {me.email} when we decide.
            </p>
          </div>
        </div>
      )}

      {rejected && !pending && (
        <div className="card flex items-start gap-3 border-error-200 bg-error-50 p-5">
          <XCircle className="mt-0.5 h-5 w-5 text-error-700" />
          <div>
            <p className="font-semibold text-error-800">Previous application rejected</p>
            <p className="mt-1 text-sm text-error-700">{rejected.notes || "No reason given."}</p>
            <p className="mt-1 text-xs text-error-600">You can resubmit below with a clearer ID photo.</p>
          </div>
        </div>
      )}

      {!pending && (
        <form onSubmit={submit} className="space-y-5">
          {/* ID upload */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-surface-900">Government-issued ID</h2>
                <p className="mt-0.5 text-sm text-surface-600">
                  Driver&apos;s license, passport, or state ID. Accepted: JPEG, PNG, WebP, HEIC, PDF · max 10&nbsp;MB.
                </p>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="rounded-md p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!file ? (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) validateAndSet(f);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragOver
                    ? "border-brand-500 bg-brand-50/50"
                    : "border-surface-300 bg-surface-50 hover:border-surface-400 hover:bg-surface-100"
                }`}
              >
                <Upload className="h-7 w-7 text-surface-400" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-surface-800">
                  Drop your ID here, or <span className="text-brand-700">browse</span>
                </p>
                <p className="mt-1 text-xs text-surface-500">
                  We encrypt the file at rest and only admins can view it.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validateAndSet(f);
                  }}
                  className="sr-only"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-success-200 bg-success-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-700">
                  {file.type.startsWith("image/") ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-surface-900">{file.name}</p>
                  <p className="text-xs text-surface-500">
                    {file.type} · {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <span className="badge badge-success">Ready</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card p-6">
            <label htmlFor="notes" className="block">
              <span className="font-display text-base font-semibold text-surface-900">
                Notes <span className="text-surface-500 font-normal text-xs">(optional)</span>
              </span>
              <p className="mt-0.5 text-sm text-surface-600">
                What kind of sales do you typically run? Neighborhood, estate, recurring?
              </p>
            </label>
            <textarea
              id="notes"
              rows={4}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Annual neighborhood yard sale every spring. Estate sales for a few families a year."
              className="input mt-3"
            />
            <p className="mt-1 text-xs text-surface-500">{notes.length}/1000</p>
          </div>

          {toast?.kind === "err" && (
            <p className="flex items-center gap-2 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
              <AlertTriangle className="h-4 w-4" />
              {toast.msg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-surface-500">By submitting you confirm this ID is yours.</p>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Submit for review
            </button>
          </div>
        </form>
      )}

      {items.length > 0 && <History items={items} />}
    </div>
  );

  function validateAndSet(f: File) {
    if (f.size > MAX_BYTES) {
      setToast({ kind: "err", msg: `File too large. Max ${MAX_BYTES / 1024 / 1024} MB.` });
      return;
    }
    if (!ACCEPT.split(",").includes(f.type)) {
      setToast({ kind: "err", msg: `Unsupported file type: ${f.type || "unknown"}. Use JPEG, PNG, WebP, HEIC, or PDF.` });
      return;
    }
    setFile(f);
    setToast(null);
  }
}

function History({ items }: { items: Item[] }) {
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-surface-200 px-5 py-3">
        <p className="eyebrow">History</p>
        <h3 className="mt-0.5 text-base font-semibold text-surface-900">Your submissions</h3>
      </header>
      <ul className="divide-y divide-surface-200">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm text-surface-700">
                {it.notes ? it.notes : (it.documentName ? `Uploaded ${it.documentName}` : <em className="text-surface-400">No notes</em>)}
              </p>
              <p className="mt-0.5 text-xs text-surface-500">
                Submitted {new Date(it.submittedAt).toLocaleString()}
                {it.reviewedAt && ` · reviewed ${new Date(it.reviewedAt).toLocaleString()}`}
              </p>
            </div>
            <StatusPill status={it.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "pending") return <span className="badge badge-info"><Clock className="h-3 w-3" /> Pending</span>;
  if (status === "approved") return <span className="badge badge-success"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
  if (status === "rejected") return <span className="badge badge-error"><XCircle className="h-3 w-3" /> Rejected</span>;
  return <span className="badge badge-neutral">{status}</span>;
}
