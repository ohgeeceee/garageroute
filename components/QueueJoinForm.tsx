"use client";

import { useState } from "react";
import { Loader2, CheckCircle, Clock } from "lucide-react";

export default function QueueJoinForm({ saleId }: { saleId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch(`/api/sales/${saleId}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, partySize: Number(partySize) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Failed to join queue");
    } else {
      setStatus("success");
      setMessage(`You're #${data.position ?? "on the list"}! We'll email you before your turn.`);
      setName("");
      setEmail("");
      setPartySize("1");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold text-zinc-900">Early-bird virtual queue</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        Join the line before you arrive. Sellers let shoppers in by order.
      </p>

      {status === "success" ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p>{message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr,1fr,100px,auto]">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            placeholder="Party"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join queue"}
          </button>
          {status === "error" && (
            <p className="col-span-full text-sm text-red-600">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}
