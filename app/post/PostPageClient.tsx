"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Plus, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { saleTypes, categories } from "@/data/sales";
import { createSale } from "@/lib/api";
import { track } from "@/lib/analytics";

type Props = {
  /** Pre-filled state name from subdomain headers. */
  stateName?: string;
  /** State slug for boundary validation. */
  stateSlug?: string;
};

export default function PostPageClient({ stateName, stateSlug }: Props) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [boundaryWarning, setBoundaryWarning] = useState<string | null>(null);
  const [sale, setSale] = useState({
    title: "",
    type: "Garage/Yard Sale",
    address: "",
    city: "",
    state: stateName ?? "",
    zip: "",
    dates: "",
    hours: "",
    description: "",
    seller: "",
  });
  const [items, setItems] = useState([
    { name: "", category: "", price: "", condition: "Good" },
  ]);

  const updateSale = (field: keyof typeof sale, value: string) => {
    setSale((prev) => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems([...items, { name: "", category: "", price: "", condition: "Good" }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (
    idx: number,
    field: keyof (typeof items)[0],
    value: string
  ) => {
    const next = [...items];
    next[idx][field] = value;
    setItems(next);
  };

  const suggestPrice = async (idx: number) => {
    const item = items[idx];
    if (!item.name || !item.category) return;
    const res = await fetch("/api/price-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: item.name,
        category: item.category,
        condition: item.condition,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    updateItem(idx, "price", String(data.suggested));
  };

  /**
   * After geocoding sets lat/lng (via address/city/zip change), check
   * that the point falls within the state's bounding box via the API.
   * Hook this into the geocode result handler when geocoding is wired up.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _checkBoundary = async (lat: number, lng: number) => {
    if (!stateSlug) return;
    setBoundaryWarning(null);
    try {
      const res = await fetch("/api/validate-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: stateSlug, lat, lng }),
      });
      if (!res.ok) return;
      const { inState } = await res.json();
      if (!inState) {
        setBoundaryWarning(
          `This address appears to be outside ${stateName ?? stateSlug}. Are you sure you want to post here?`
        );
      }
    } catch {
      // Non-fatal — skip boundary check
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    track("sale_post_started", { type: sale.type, items: items.length });
    try {
      const newSale = await createSale({ ...sale, items });
      track("sale_post_complete", { sale_id: newSale.id, type: sale.type });
      setSubmitted(true);
      router.push(`/sales/${newSale.id}`);
    } catch (err) {
      track("sale_post_failed");
      alert(err instanceof Error ? err.message : "Failed to create sale");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-8">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">
            Your sale is live!
          </h1>
          <p className="mt-2 text-zinc-600">
            Redirecting you to your new listing…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900">Post your sale</h1>
      <p className="mt-1 text-zinc-600">
        Free listings. Add items and photos so buyers know what to expect before
        they arrive.
      </p>

      {boundaryWarning && (
        <div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0 mt-0.5" />
          <p className="text-sm text-warning-800">{boundaryWarning}</p>
          <button
            type="button"
            onClick={() => setBoundaryWarning(null)}
            className="ml-auto text-warning-600 hover:text-warning-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900">Sale details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">
                Sale title
              </label>
              <input
                required
                value={sale.title}
                onChange={(e) => updateSale("title", e.target.value)}
                placeholder="e.g. Huge Multi-Family Garage Sale"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Sale type
              </label>
              <select
                value={sale.type}
                onChange={(e) => updateSale("type", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {saleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Dates
              </label>
              <input
                required
                value={sale.dates}
                onChange={(e) => updateSale("dates", e.target.value)}
                placeholder="Sat, Jun 20 – Sun, Jun 21"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Hours
              </label>
              <input
                required
                value={sale.hours}
                onChange={(e) => updateSale("hours", e.target.value)}
                placeholder="8:00 AM – 2:00 PM"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">
                Street address
              </label>
              <input
                required
                value={sale.address}
                onChange={(e) => updateSale("address", e.target.value)}
                placeholder="123 Main St"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                City
              </label>
              <input
                required
                value={sale.city}
                onChange={(e) => updateSale("city", e.target.value)}
                placeholder="Indianapolis"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                State
              </label>
              <input
                value={sale.state}
                onChange={(e) => updateSale("state", e.target.value)}
                placeholder="IN"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                ZIP
              </label>
              <input
                value={sale.zip}
                onChange={(e) => updateSale("zip", e.target.value)}
                placeholder="46268"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Seller / host name
              </label>
              <input
                value={sale.seller}
                onChange={(e) => updateSale("seller", e.target.value)}
                placeholder="Jane D."
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">
                Description
              </label>
              <textarea
                rows={4}
                value={sale.description}
                onChange={(e) => updateSale("description", e.target.value)}
                placeholder="What are you selling? Any special instructions?"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Items for sale</h2>
            <span className="text-sm text-zinc-500">
              Optional but recommended
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr,120px,100px,120px,40px]"
              >
                <input
                  value={item.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                  placeholder="Item name"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <select
                  value={item.category}
                  onChange={(e) => updateItem(idx, "category", e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <input
                    value={item.price}
                    onChange={(e) => updateItem(idx, "price", e.target.value)}
                    placeholder="Price"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => suggestPrice(idx)}
                    title="Suggest a price"
                    className="absolute right-1 top-1 rounded-md p-1 text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
                <select
                  value={item.condition}
                  onChange={(e) => updateItem(idx, "condition", e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {["New", "Like New", "Good", "Fair"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="flex items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-blue-600 px-8 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Publishing…" : "Publish sale"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
