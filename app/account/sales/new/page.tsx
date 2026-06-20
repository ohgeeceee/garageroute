"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { PhotoUploader, type PhotoEntry } from "@/components/PhotoUploader";

type Me = { id: string; name: string; city: string; state: string; zip: string; verifiedSeller: boolean } | null;

export default function NewSalePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [form, setForm] = useState({
    title: "",
    type: "garage",
    address: "",
    city: "",
    state: "",
    zip: "",
    dates: "",
    hours: "",
    description: "",
  });
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((d: { user: Me }) => {
        setMe(d.user);
        if (d.user) {
          setForm((f) => ({
            ...f,
            city: f.city || d.user!.city,
            state: f.state || d.user!.state,
            zip: f.zip || d.user!.zip,
          }));
        }
      })
      .catch(() => setMe(null));
  }, []);

  const photoKeys = useMemo(() => photos.filter((p) => p.key).map((p) => p.key!) , [photos]);
  const stillUploading = photos.some((p) => p.status === "uploading");
  const hasErrors = photos.some((p) => p.status === "error");

  if (me === undefined) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>;
  }
  if (!me) {
    router.replace("/login?next=/account/sales/new");
    return null;
  }

  if (!me.verifiedSeller) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-warning-600" />
        <h1 className="mt-4 text-xl font-bold text-surface-900">Verification required</h1>
        <p className="mt-2 max-w-md text-sm text-surface-600">
          Only verified sellers can post sales. Submit your verification request to get started.
        </p>
        <a href="/account/verify" className="btn btn-primary mt-6">
          <ShieldCheck className="h-4 w-4" /> Submit verification
        </a>
      </div>
    );
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (stillUploading) {
      setError("Wait for photos to finish uploading.");
      return;
    }
    if (hasErrors) {
      setError("Remove failed photos before submitting.");
      return;
    }
    if (!form.title || !form.address || !form.city || !form.state || !form.zip) {
      setError("Title, address, city, state, and ZIP are required.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/account/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photoKeys }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create sale.");
      router.replace(`/account/sales/${data.sale.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">New listing</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Post a sale</h1>
        <p className="mt-1 text-sm text-surface-600">
          Buyers within 25 miles will see this on the browse page and in alerts.
        </p>
      </header>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <Field label="Title" required>
          <input type="text" required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Smith Family Garage Sale" className="input" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" required>
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className="input">
              <option value="garage">Garage sale</option>
              <option value="estate">Estate sale</option>
              <option value="moving">Moving sale</option>
              <option value="yard">Yard sale</option>
              <option value="estate-auction">Estate auction</option>
            </select>
          </Field>
          <Field label="ZIP" required>
            <input type="text" required maxLength={12} value={form.zip} onChange={(e) => set("zip", e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Street address" required>
          <input type="text" required maxLength={200} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" className="input" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="City" required>
            <input type="text" required maxLength={80} value={form.city} onChange={(e) => set("city", e.target.value)} className="input" />
          </Field>
          <Field label="State" required>
            <input type="text" required maxLength={4} value={form.state} onChange={(e) => set("state", e.target.value)} className="input" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dates" hint='e.g. "Sat May 23, 9–4"'>
            <input type="text" maxLength={200} value={form.dates} onChange={(e) => set("dates", e.target.value)} className="input" />
          </Field>
          <Field label="Hours" hint='e.g. "9am–4pm"'>
            <input type="text" maxLength={120} value={form.hours} onChange={(e) => set("hours", e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Description" hint="What will buyers find? Furniture, tools, kids' stuff, etc.">
          <textarea rows={4} maxLength={2000} value={form.description} onChange={(e) => set("description", e.target.value)} className="input" />
        </Field>

        <Field label="Photos" hint={`${photos.filter((p) => p.status === "done").length}/8 — first photo is the cover.`}>
          <PhotoUploader scope="sales" value={photos} onChange={setPhotos} max={8} />
        </Field>

        {error && (
          <p role="alert" className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <a href="/account/sales" className="btn btn-secondary">Cancel</a>
          <button type="submit" disabled={busy || stillUploading} className="btn btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Create sale
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-surface-600">
        {label}{required && <span className="ml-0.5 text-error-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-surface-500">{hint}</span>}
    </label>
  );
}
