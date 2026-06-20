"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle, MessageCircle } from "lucide-react";

export default function MessageForm({ saleId }: { saleId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch(`/api/sales/${saleId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderName: name, senderEmail: email, content }),
    });
    if (!res.ok) {
      setStatus("error");
      setMessage("Failed to send message");
    } else {
      setStatus("success");
      setMessage("Message sent! The seller will reply by email.");
      setName("");
      setEmail("");
      setContent("");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold text-zinc-900">Message the seller</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        Ask questions, request more photos, or suggest a safe public meetup spot.
      </p>

      {status === "success" ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p>{message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
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
              placeholder="Your email"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <textarea
            required
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hi, is this still available? Would you meet at the library?"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send message
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}
