"use client";

import { useState } from "react";
import { Bell, Loader2, CheckCircle } from "lucide-react";
import { categories } from "@/data/sales";

type Props = {
  defaultZip?: string;
};

export default function AlertSignup({ defaultZip }: Props = {}) {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState(defaultZip || "");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState("25");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zip, category, radius: Number(radius) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      setStatus("success");
      setMessage("You're subscribed! We'll email you when matching sales are posted.");
      setEmail("");
      setZip("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white sm:p-8">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6" />
        <h2 className="text-xl font-bold">Get sale alerts</h2>
      </div>
      <p className="mt-1 text-blue-100">
        Be the first to know when new sales match your interests and ZIP code.
      </p>

      {status === "success" ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 p-4">
          <CheckCircle className="h-5 w-5 text-emerald-300" />
          <p>{message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr,1fr,140px,120px,auto]">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="rounded-lg border-0 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <input
            required
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP code"
            className="rounded-lg border-0 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border-0 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <option value="">Any category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="rounded-lg border-0 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <option value="10">10 mi</option>
            <option value="25">25 mi</option>
            <option value="50">50 mi</option>
          </select>
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Subscribe"
            )}
          </button>
          {status === "error" && (
            <p className="col-span-full text-sm text-red-200">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}
