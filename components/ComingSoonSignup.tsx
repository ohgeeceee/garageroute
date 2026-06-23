"use client";

import { useState } from "react";
import { Bell, Loader2, CheckCircle } from "lucide-react";

type Props = {
  stateSlug: string;
  stateName: string;
};

export default function ComingSoonSignup({ stateSlug, stateName }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/state-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, stateSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      setStatus("success");
      setMessage(
        `You're on the list! We'll email you the moment ${stateName} launches.`
      );
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-success-50 p-4 text-success-700">
        <CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 rounded-lg border border-surface-300 px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              <Bell className="h-4 w-4" aria-hidden="true" />
              Notify me
            </>
          )}
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{message}</p>
      )}
      <p className="text-xs text-surface-400">
        We&apos;ll only email you when {stateName} launches. No spam, ever.
      </p>
    </form>
  );
}
