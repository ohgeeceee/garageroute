"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, CheckCircle, RotateCcw } from "lucide-react";
import { Sale } from "@/data/sales";

type UpdateResult = Sale | { error: string };

export default function SaleSettings({
  sale,
  token,
  onUpdate,
}: {
  sale: Sale;
  token: string;
  onUpdate: (sale: Sale) => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  const currentStatus = (sale as Sale & { status?: string }).status || "active";

  const updateStatus = async (
    next: "active" | "ended" | "cancelled",
    noteText = ""
  ) => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, statusNote: noteText }),
      });
      const data = (await res.json()) as UpdateResult;
      if (!res.ok || "error" in data) {
        throw new Error(("error" in data && data.error) || "Failed to update");
      }
      onUpdate(data);
      setStatus("success");
      setMessage(
        next === "cancelled"
          ? "Sale cancelled. Buyers will see a banner."
          : next === "ended"
          ? "Sale marked as ended."
          : "Sale re-opened."
      );
      setNote("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleCancel = () => {
    const reason = window.prompt(
      "Cancel this sale?\n\nBuyers will see a 'cancelled' banner on the listing. Add an optional note for buyers (e.g. 'Postponed to next weekend'):",
      note
    );
    // prompt returns null on cancel — bail out.
    if (reason === null) return;
    updateStatus("cancelled", reason.trim());
  };

  const handleEnd = () => {
    if (
      !confirm(
        "Mark this sale as ended?\n\nIt will stay visible but show as ended. Buyers won't be able to reserve items or join the queue."
      )
    )
      return;
    updateStatus("ended");
  };

  const handleReopen = () => {
    updateStatus("active");
  };

  const statusBadge =
    currentStatus === "cancelled"
      ? "bg-red-100 text-red-700"
      : currentStatus === "ended"
      ? "bg-zinc-200 text-zinc-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900">Sale status</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadge}`}
          >
            {currentStatus}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          Buyers see a banner when a sale is cancelled or ended. Re-open
          anytime to bring it back.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {currentStatus === "active" && (
            <>
              <button
                onClick={handleEnd}
                disabled={status === "loading"}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Mark as ended
              </button>
              <button
                onClick={handleCancel}
                disabled={status === "loading"}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Cancel sale
              </button>
            </>
          )}

          {currentStatus !== "active" && (
            <button
              onClick={handleReopen}
              disabled={status === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Re-open sale
            </button>
          )}
        </div>

        {status === "success" && (
          <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            {message}
          </p>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">{message}</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="font-semibold text-zinc-900">Seller link</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Bookmark this page. This secret link is the only way to manage your
          sale.
        </p>
        <div className="mt-3 break-all rounded-lg bg-zinc-100 p-3 text-xs font-mono text-zinc-700">
          {`${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/manage/${token}`}
        </div>
      </div>
    </div>
  );
}
