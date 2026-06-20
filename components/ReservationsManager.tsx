"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CreditCard, CheckCircle, XCircle } from "lucide-react";

interface Reservation {
  id: string;
  item: { name: string; price?: number };
  buyerName: string;
  buyerEmail: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function ReservationsManager({ token }: { token: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/manage/${token}/reservations`)
      .then((res) => res.json())
      .then((data) => {
        setReservations(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    load();
  }, [token, load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/manage/${token}/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-violet-600" />
          <h2 className="font-semibold text-zinc-900">Reservations</h2>
        </div>
        <span className="text-sm text-zinc-500">{reservations.length} total</span>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : reservations.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No reservations yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reservations.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-zinc-900">{r.item.name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.status === "paid" || r.status === "redeemed"
                      ? "bg-emerald-100 text-emerald-700"
                      : r.status === "refunded"
                      ? "bg-zinc-200 text-zinc-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <p className="text-sm text-zinc-600">
                {r.buyerName} · {r.buyerEmail} · deposit ${r.amount.toFixed(2)}
              </p>
              <div className="mt-2 flex gap-2">
                {r.status !== "redeemed" && (
                  <button
                    onClick={() => updateStatus(r.id, "redeemed")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Mark redeemed
                  </button>
                )}
                {r.status !== "refunded" && (
                  <button
                    onClick={() => updateStatus(r.id, "refunded")}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-300"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Refund
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
