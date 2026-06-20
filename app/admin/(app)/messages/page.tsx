"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Inbox } from "lucide-react";

type MessageRow = {
  id: string;
  senderName: string;
  senderEmail: string;
  content: string;
  createdAt: string;
  sale: { id: string; title: string };
};

export default function AdminMessagesPage() {
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/messages")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setRows(Array.isArray(d) ? d : (d.rows ?? [])))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Inbox</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Messages</h2>
        <p className="mt-1 text-sm text-surface-600">
          Buyer-to-seller inquiries across all listings.
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-10 w-10 text-surface-300" />
            <h3 className="mt-3 text-sm font-semibold text-surface-900">No messages yet</h3>
            <p className="mt-1 text-sm text-surface-500">Buyer inquiries will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {rows.map((m) => (
              <li key={m.id} className="p-5 hover:bg-surface-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs">
                      {m.senderName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-900">
                        {m.senderName}
                        <span className="ml-2 text-xs font-normal text-surface-500">{m.senderEmail}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-surface-500">
                        re: <span className="font-medium text-surface-700">{m.sale.title}</span>
                      </p>
                      <p className="mt-2 text-sm text-surface-800">{m.content}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-surface-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
