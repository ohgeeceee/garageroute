"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Plus, Trash2, Sparkles, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saleTypes, categories } from "@/data/sales";
import { createSale } from "@/lib/api";

type Photo = { key: string; url: string; status: "uploading" | "done" | "error" };

export default function PostPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sale, setSale] = useState({
    title: "",
    type: "Garage/Yard Sale",
    address: "",
    city: "",
    state: "",
    zip: "",
    dates: "",
    hours: "",
    description: "",
    seller: "",
  });
  const [items, setItems] = useState([
    { name: "", category: "", price: "", condition: "Good" },
  ]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Wait for any in-flight uploads to finish before submitting.
      const stillUploading = photos.some((p) => p.status === "uploading");
      if (stillUploading) {
        toast.error("Wait for photos to finish uploading.");
        setSubmitting(false);
        return;
      }
      const photoKeys = photos
        .filter((p) => p.status === "done")
        .map((p) => p.key);

      const newSale = await createSale({ ...sale, items, photos: photoKeys });
      setSubmitted(true);
      router.push(`/sales/${newSale.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sale");
      setSubmitting(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const MAX_PHOTOS = 8;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Max ${MAX_PHOTOS} photos per listing.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      toast(`Only added the first ${remaining} photos (max ${MAX_PHOTOS}).`);
    }

    // Reserve slots so the UI shows them as uploading immediately.
    const placeholders: Photo[] = accepted.map(() => ({
      key: "",
      url: "",
      status: "uploading",
    }));
    setPhotos((prev) => [...prev, ...placeholders]);

    // Upload in parallel — failures flip just that slot to error.
    await Promise.all(
      accepted.map(async (file, i) => {
        const idx = photos.length + i; // index in the array we just appended
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/uploads/photo", { method: "POST", body: fd });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Upload failed" }));
            throw new Error(err.error || "Upload failed");
          }
          const data = (await res.json()) as { key: string; url: string };
          setPhotos((prev) =>
            prev.map((p, n) => (n === idx ? { key: data.key, url: data.url, status: "done" } : p))
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          setPhotos((prev) =>
            prev.map((p, n) => (n === idx ? { key: "", url: "", status: "error" } : p))
          );
          toast.error(`${file.name}: ${msg}`);
        }
      })
    );

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, n) => n !== idx));
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
            <h2 className="font-semibold text-zinc-900">Photos</h2>
            <span className="text-sm text-zinc-500">
              Up to 8 photos. Buyers want to see what's there.
            </span>
          </div>

          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
              id="photo-input"
            />
            <label
              htmlFor="photo-input"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm font-medium text-zinc-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            >
              <Upload className="h-5 w-5" />
              Click to upload photos
            </label>

            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                  >
                    {p.status === "done" && p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.url}
                        alt={`Photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : p.status === "uploading" ? (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-red-50 text-xs text-red-600">
                        Failed
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-zinc-700 shadow-sm opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
