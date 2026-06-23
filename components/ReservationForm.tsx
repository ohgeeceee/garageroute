"use client";

import { useState } from "react";
import { CreditCard, Loader2, CheckCircle, Tag, XCircle } from "lucide-react";
import { Item } from "@/data/sales";

export default function ReservationForm({
  saleId,
  items,
  disabled,
}: {
  saleId: string;
  items: Item[];
  disabled?: boolean;
}) {
  const [itemId, setItemId] = useState(items[0]?.id || "");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [amount, setAmount] = useState("5");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId, itemId, buyerName, buyerEmail, amount: Number(amount) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Failed to create reservation");
    } else {
      setStatus("success");
      setMessage(`Reservation created! Deposit: $${amount}. The seller will hold the item.`);
      setBuyerName("");
      setBuyerEmail("");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-violet-600" />
        <h2 className="font-semibold text-zinc-900">Reserve with a deposit</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        Put down a small deposit so the seller holds an item for you.
      </p>

      {disabled && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-zinc-50 p-4 text-zinc-600">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          <p className="text-sm">
            New reservations are closed because this sale is no longer active.
          </p>
        </div>
      )}

      <form onSubmit={submit} className={`mt-4 space-y-3 ${disabled ? "hidden" : ""}`}>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Item</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.price ? `($${item.price})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Your name</label>
            <input
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email</label>
            <input
              required
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="jane@example.com"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Deposit amount ($)</label>
          <div className="relative mt-1">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              required
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          Reserve now
        </button>
        {status === "error" && <p className="text-sm text-red-600">{message}</p>}
      </form>
    </div>
  );
}
