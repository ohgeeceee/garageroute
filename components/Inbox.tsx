"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";

interface Message {
  id: string;
  senderName: string;
  senderEmail: string;
  content: string;
  createdAt: string;
}

export default function Inbox({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/manage/${token}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-zinc-900">Inbox</h2>
        </div>
        <span className="text-sm text-zinc-500">{messages.length} messages</span>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : messages.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No messages yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-zinc-900">{m.senderName}</p>
                <a
                  href={`mailto:${m.senderEmail}?subject=Re: Your GarageRoute inquiry`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {m.senderEmail}
                </a>
              </div>
              <p className="mt-1 text-sm text-zinc-700">{m.content}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
