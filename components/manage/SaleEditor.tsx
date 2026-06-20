"use client";

import { useState } from "react";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { Sale } from "@/data/sales";
import { saleTypes } from "@/data/sales";

export default function SaleEditor({
  sale,
  token,
  onUpdate,
}: {
  sale: Sale;
  token: string;
  onUpdate: (sale: Sale) => void;
}) {
  const [form, setForm] = useState({
    title: sale.title,
    type: sale.type,
    address: sale.address,
    city: sale.city,
    state: sale.state,
    zip: sale.zip,
    dates: sale.dates,
    hours: sale.hours,
    description: sale.description,
    seller: sale.seller,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const update = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (status === "success") setStatus("idle");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      onUpdate(data);
      setStatus("success");
      setMessage("Sale details saved.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Sale title</label>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Sale type</label>
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {saleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Seller / host name</label>
          <input
            value={form.seller}
            onChange={(e) => update("seller", e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Street address</label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">City</label>
          <input
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">State</label>
            <input
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">ZIP</label>
            <input
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Dates</label>
          <input
            value={form.dates}
            onChange={(e) => update("dates", e.target.value)}
            placeholder="Sat, Jun 20 – Sun, Jun 21"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Hours</label>
          <input
            value={form.hours}
            onChange={(e) => update("hours", e.target.value)}
            placeholder="8:00 AM – 2:00 PM"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save changes
        </button>
        {status === "success" && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            {message}
          </span>
        )}
        {status === "error" && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </form>
  );
}
