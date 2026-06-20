"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  ShieldOff,
  Save,
} from "lucide-react";

type Sale = {
  id: string;
  title: string;
  seller: string;
  dates: string;
  hours: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  verified: boolean;
  impactKg: number;
  photos: string[];
  donationRequested: boolean;
  donationStatus: string;
  donationOrg: string;
  items: {
    id: string;
    name: string;
    category: string;
    price?: number;
    condition: string;
    photo?: string;
    sold: boolean;
  }[];
};

export default function AdminSalePage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/sales/${token}`)
      .then(async (r) => {
        if (r.status === 401) { window.location.href = "/admin/login"; return null; }
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed");
        return data;
      })
      .then((d) => { if (d) setSale(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleVerify = async () => {
    if (!sale) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales/${sale.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !sale.verified }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setSale({ ...sale, verified: json.verified });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>;
  }
  if (error || !sale) {
    return (
      <div className="card p-6 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-bold text-surface-900">Sale not found</h1>
        <p className="mt-2 text-sm text-surface-600">{error}</p>
        <button onClick={() => router.push("/admin/sales")} className="btn btn-secondary btn-sm mt-6">
          <ArrowLeft className="h-4 w-4" /> Back to sales
        </button>
      </div>
    );
  }

  const listedValue = sale.items.reduce((sum, i) => sum + (i.price || 0), 0);
  const soldCount = sale.items.filter((i) => i.sold).length;
  const availableCount = sale.items.length - soldCount;
  const cover = sale.photos?.[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/admin/sales")} className="text-sm text-surface-600 hover:text-surface-900 inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Sales
        </button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-surface-900">{sale.title}</h2>
              {sale.verified ? (
                <span className="badge badge-success"><CheckCircle2 className="h-3 w-3" /> Verified</span>
              ) : (
                <span className="badge badge-warning"><Clock className="h-3 w-3" /> Pending</span>
              )}
            </div>
            <p className="mt-1 text-sm text-surface-600">
              by <span className="font-semibold text-surface-800">{sale.seller}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-600">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-surface-400" /> {sale.address}, {sale.city}, {sale.state} {sale.zip}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-surface-400" /> {sale.dates}{sale.hours ? ` · ${sale.hours}` : ""}</span>
            </div>
          </div>
          <button onClick={toggleVerify} disabled={busy} className={sale.verified ? "btn btn-secondary" : "btn btn-primary"}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : sale.verified ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {sale.verified ? "Remove verification" : "Verify listing"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Items listed" value={sale.items.length.toString()} icon={Package} />
        <KPI label="Available" value={availableCount.toString()} icon={Package} tone="success" />
        <KPI label="Sold" value={soldCount.toString()} icon={CheckCircle2} tone="info" />
        <KPI label="Listed value" value={`$${listedValue.toFixed(2)}`} icon={DollarSign} tone="brand" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Inventory */}
        <section className="card overflow-hidden lg:col-span-2">
          <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
            <div>
              <p className="eyebrow">Inventory</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">Items</h3>
            </div>
            <span className="badge badge-neutral">{sale.items.length} total</span>
          </header>
          {sale.items.length === 0 ? (
            <p className="p-6 text-sm text-surface-500">No items listed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Condition</th>
                    <th className="text-right">Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {item.photo ? (
                            <img src={item.photo} alt="" aria-hidden="true" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-surface-100" />
                          )}
                          <span className={`font-medium ${item.sold ? "text-surface-400 line-through" : "text-surface-900"}`}>{item.name}</span>
                        </div>
                      </td>
                      <td className="text-surface-700">{item.category}</td>
                      <td className="text-surface-700">{item.condition}</td>
                      <td className="text-right font-semibold text-surface-900">
                        {item.price ? `$${item.price.toFixed(2)}` : "—"}
                      </td>
                      <td>
                        {item.sold ? (
                          <span className="badge badge-neutral">Sold</span>
                        ) : (
                          <span className="badge badge-success">Available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sidebar details */}
        <aside className="space-y-4">
          {cover && (
            <div className="card overflow-hidden">
              <img src={cover} alt="" aria-hidden="true" className="aspect-video w-full object-cover" />
            </div>
          )}
          <section className="card p-5">
            <p className="eyebrow">About this sale</p>
            <p className="mt-2 text-sm text-surface-800 leading-relaxed">{sale.description}</p>
          </section>
          <section className="card p-5">
            <p className="eyebrow">Donation</p>
            <p className="mt-2 text-sm text-surface-800">
              {sale.donationRequested ? "Requested" : "Not requested"}
              {sale.donationStatus ? ` · ${sale.donationStatus}` : ""}
            </p>
            {sale.donationOrg && <p className="text-sm text-surface-600">{sale.donationOrg}</p>}
          </section>
          <section className="card p-5">
            <p className="eyebrow">Impact</p>
            <p className="mt-2 text-2xl font-bold text-success-700">{sale.impactKg.toFixed(1)} kg</p>
            <p className="text-xs text-surface-500">waste diverted (estimated)</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function KPI({
  label, value, icon: Icon, tone = "neutral",
}: {
  label: string; value: string; icon: React.ElementType;
  tone?: "brand" | "success" | "info" | "neutral";
}) {
  const tones: Record<string, string> = {
    brand:   "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-700",
    info:    "bg-info-50 text-info-600",
    neutral: "bg-surface-100 text-surface-700",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-surface-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
