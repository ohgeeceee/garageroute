"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type Item = {
  id: string;
  status: string;
  notes: string;
  documentUrl: string;
  submittedAt: string;
  reviewedAt: string | null;
};

export default function VerifyPage() {
  const [me, setMe] = useState<{ id: string; verifiedSeller: boolean; name: string; email: string } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/account/me").then((r) => r.json()),
      fetch("/api/account/verify").then((r) => r.json()),
    ])
      .then(([meRes, verRes]: [{ user: typeof me }, { items: Item[] }]) => {
        setMe(meRes.user);
        setItems(verRes.items || []);
        setLoading(false);
      });
  }, []);

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
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, documentUrl }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Submission failed.");
      setToast({ kind: "ok", msg: "Submitted. We'll review within 24 hours." });
      const ver = await fetch("/api/account/verify").then((r) => r.json());
      setItems(ver.items || []);
      setNotes("");
      setDocumentUrl("");
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Verification</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Become a verified seller</h1>
        <p className="mt-1 text-sm text-surface-600">Tell us about yourself and your sales. Reviews typically take 24 hours.</p>
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
            <p className="mt-1 text-xs text-error-600">You can resubmit below with more detail.</p>
          </div>
        </div>
      )}

      {!pending && (
        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">
              Document URL (optional)
            </label>
            <input
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://… link to ID photo or business doc"
              className="input"
            />
            <p className="mt-1 text-xs text-surface-500">For v1 we accept a link to a hosted image (Google Drive, Dropbox, etc). Direct upload coming soon.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">
              Notes
            </label>
            <textarea
              rows={5}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What kind of sales do you typically run? Neighborhood, estate, recurring? Anything that helps us verify."
              className="input"
            />
            <p className="mt-1 text-xs text-surface-500">{notes.length}/1000</p>
          </div>

          {toast?.kind === "err" && (
            <p className="flex items-center gap-2 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
              <AlertTriangle className="h-4 w-4" />
              {toast.msg}
            </p>
          )}

          <div className="flex items-center justify-end">
            <button type="submit" disabled={busy || (!notes.trim() && !documentUrl.trim())} className="btn btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Submit for review
            </button>
          </div>
        </form>
      )}

      {items.length > 0 && <History items={items} />}
    </div>
  );
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
              <p className="text-sm text-surface-700">{it.notes || <em className="text-surface-400">No notes</em>}</p>
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
