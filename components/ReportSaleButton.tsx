"use client";

import { useState } from "react";
import { Flag, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam or scam" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "already_over", label: "Sale already over" },
  { value: "wrong_address", label: "Wrong address" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "scam", label: "Suspected scam" },
  { value: "other", label: "Something else" },
];

export default function ReportSaleButton({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setOpen(false);
    setSubmitting(false);
    setDone(false);
    setEmail("");
    setReason("");
    setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales/${saleId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Report failed" }));
        throw new Error(err.error || "Report failed");
      }
      setDone(true);
      toast.success("Thanks — we'll review it shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <Flag className="h-4 w-4" />
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Report this listing</h2>
              <button
                type="button"
                onClick={reset}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Report received</span>
                </div>
                <p className="mt-1 text-sm text-emerald-700">
                  Our team reviews reports within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Your email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    We never share your email with the seller.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Reason <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Choose a reason…</option>
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Anything else we should know?
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional context"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}