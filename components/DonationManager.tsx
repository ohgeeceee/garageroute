"use client";

import { useState } from "react";
import { Heart, Loader2, CheckCircle, Truck } from "lucide-react";

const orgs = ["Goodwill", "Habitat for Humanity", "Salvation Army", "Local Charity"];

interface Props {
  sale: {
    id: string;
    donationRequested?: boolean;
    donationStatus?: string;
    donationOrg?: string;
  };
  token: string;
  onUpdate?: (sale: Record<string, unknown>) => void;
}

export default function DonationManager({ sale, token, onUpdate }: Props) {
  const [org, setOrg] = useState(sale.donationOrg || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setStatus("loading");
    const res = await fetch(`/api/sales/${sale.id}/donate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org, sellerToken: token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Failed to schedule pickup");
    } else {
      setStatus("success");
      setMessage(`Donation pickup requested with ${org}.`);
      if (onUpdate) onUpdate(data);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-emerald-600" />
        <h2 className="font-semibold text-zinc-900">Donation pickup</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        After your sale, schedule a pickup for unsold items and keep them out of
        the landfill.
      </p>

      {sale.donationRequested ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              Pickup requested with {sale.donationOrg}
            </p>
            <p className="text-sm">Status: {sale.donationStatus || "pending"}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={request} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Organization
            </label>
            <select
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Choose one</option>
              {orgs.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!org || status === "loading"}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
            Request pickup
          </button>
          {status === "error" && (
            <p className="w-full text-sm text-red-600">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}
