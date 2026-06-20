"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { Sale } from "@/data/sales";

export default function SaleSettings({
  sale,
  token,
  onUpdate,
}: {
  sale: Sale;
  token: string;
  onUpdate: (sale: Sale) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const closeSale = async () => {
    if (!confirm("Mark this sale as ended? You can re-open it later.")) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sale.title + " (Ended)",
          description: sale.description + "\n\nThis sale has ended.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data);
      setStatus("success");
      setMessage("Sale marked as ended.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="font-semibold text-zinc-900">Danger zone</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Ending the sale updates the title and description so buyers know it is no
          longer active.
        </p>
        <button
          onClick={closeSale}
          disabled={status === "loading"}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          Mark sale as ended
        </button>
        {status === "success" && (
          <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            {message}
          </p>
        )}
        {status === "error" && <p className="mt-3 text-sm text-red-600">{message}</p>}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="font-semibold text-zinc-900">Seller link</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Bookmark this page. This secret link is the only way to manage your sale.
        </p>
        <div className="mt-3 break-all rounded-lg bg-zinc-100 p-3 text-xs font-mono text-zinc-700">
          {`${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/manage/${token}`}
        </div>
      </div>
    </div>
  );
}
