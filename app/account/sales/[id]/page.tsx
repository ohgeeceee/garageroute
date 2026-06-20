"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
  Package,
  MessageSquare,
  ArrowLeft,
  Hash,
  Link2,
} from "lucide-react";

type Sale = {
  id: string;
  title: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dates: string;
  hours: string;
  description: string;
  verified: boolean;
  sellerToken: string;
  _count: { items: number; messages: number; reservations: number; queues: number };
};

export default function AccountSaleEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const saleId = params.id;
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/account/sales/${saleId}`);
      if (res.status === 404) { router.replace("/account/sales"); return; }
      const data = await res.json();
      setSale(data);
    } catch {
      setError("Failed to load sale.");
    } finally {
      setLoading(false);
    }
  }, [saleId, router]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<Sale>) => {
    if (!sale) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/account/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed.");
      setToast({ kind: "ok", msg: "Saved." });
      await load();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 1800);
    }
  };

  const remove = async () => {
    if (!sale) return;
    if (!confirm(`Delete "${sale.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/account/sales/${sale.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed.");
      router.replace("/account/sales");
      router.refresh();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
      setDeleting(false);
    }
  };

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ kind: "ok", msg: `${label} copied.` });
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast({ kind: "err", msg: "Clipboard blocked." });
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>;
  }
  if (error || !sale) {
    return (
      <div className="card p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-error-600" />
        <h1 className="mt-4 text-lg font-bold text-surface-900">{error || "Not found"}</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/account/sales" className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-900">
        <ArrowLeft className="h-4 w-4" /> My sales
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Sale</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">{sale.title}</h1>
          <p className="mt-1 text-sm text-surface-600">{sale.address}, {sale.city}, {sale.state} {sale.zip}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={remove} disabled={deleting} className="btn btn-secondary text-error-700">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </header>

      <section className="card p-6 space-y-5">
        <Field label="Title">
          <input defaultValue={sale.title} id="f-title" className="input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select defaultValue={sale.type} id="f-type" className="input">
              <option value="garage">Garage sale</option>
              <option value="estate">Estate sale</option>
              <option value="moving">Moving sale</option>
              <option value="yard">Yard sale</option>
              <option value="estate-auction">Estate auction</option>
            </select>
          </Field>
          <Field label="ZIP">
            <input defaultValue={sale.zip} id="f-zip" className="input" />
          </Field>
        </div>
        <Field label="Street address">
          <input defaultValue={sale.address} id="f-address" className="input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="City"><input defaultValue={sale.city} id="f-city" className="input" /></Field>
          <Field label="State"><input defaultValue={sale.state} id="f-state" className="input" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dates"><input defaultValue={sale.dates} id="f-dates" className="input" /></Field>
          <Field label="Hours"><input defaultValue={sale.hours} id="f-hours" className="input" /></Field>
        </div>
        <Field label="Description">
          <textarea rows={4} defaultValue={sale.description} id="f-description" className="input" />
        </Field>

        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              const get = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";
              save({
                title: get("f-title"),
                type: get("f-type"),
                address: get("f-address"),
                city: get("f-city"),
                state: get("f-state"),
                zip: get("f-zip"),
                dates: get("f-dates"),
                hours: get("f-hours"),
                description: get("f-description"),
              });
            }}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <header className="border-b border-surface-200 px-5 py-3">
          <p className="eyebrow">Quick links</p>
          <h3 className="mt-0.5 text-base font-semibold text-surface-900">Share &amp; reference</h3>
        </header>
        <ul className="divide-y divide-surface-200">
          <li>
            <button
              onClick={() => copy("Sale ID", sale.id)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-surface-50"
            >
              <span className="flex items-center gap-3">
                <Hash className="h-4 w-4 text-surface-400" />
                <span>
                  <span className="block text-sm font-semibold text-surface-900">Sale ID</span>
                  <span className="block truncate text-xs text-surface-500">{sale.id}</span>
                </span>
              </span>
              <span className="text-xs font-semibold text-brand-700">Copy</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => copy("Public URL", `${window.location.origin}/sales/${sale.id}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-surface-50"
            >
              <span className="flex items-center gap-3">
                <Link2 className="h-4 w-4 text-surface-400" />
                <span>
                  <span className="block text-sm font-semibold text-surface-900">Public URL</span>
                  <span className="block truncate text-xs text-surface-500">{`/sales/${sale.id}`}</span>
                </span>
              </span>
              <span className="text-xs font-semibold text-brand-700">Copy</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => copy("Seller link", `${window.location.origin}/manage/${sale.sellerToken}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-surface-50"
            >
              <span className="flex items-center gap-3">
                <Link2 className="h-4 w-4 text-surface-400" />
                <span>
                  <span className="block text-sm font-semibold text-surface-900">Manage link</span>
                  <span className="block truncate text-xs text-surface-500">{`/manage/${sale.sellerToken.slice(0, 12)}…`}</span>
                </span>
              </span>
              <span className="text-xs font-semibold text-brand-700">Copy</span>
            </button>
          </li>
        </ul>
      </section>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">{label}</span>
      {children}
    </label>
  );
}
