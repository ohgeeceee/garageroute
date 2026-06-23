"use client";

import { useState } from "react";
import { Bell, Loader2, CheckCircle } from "lucide-react";

type Props = {
  stateSlug: string;
  stateName: string;
};

export default function StateSignupForm({ stateSlug, stateName }: Props) {
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
      setMessage(`We'll email you when GarageRoute launches in ${stateName}.`);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success-50 border border-success-100 p-3 text-sm text-success-700">
        <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-surface-600 mb-1">
        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
        Get notified when we launch
      </div>
      <div className="flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="input input-sm flex-1"
          disabled={status === "loading"}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn btn-primary btn-sm shrink-0"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Notify me"
          )}
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-error-600">{message}</p>
      )}
    </form>
  );
}
