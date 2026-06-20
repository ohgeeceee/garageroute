"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react";

interface QueueEntry {
  id: string;
  name: string;
  email: string;
  partySize: number;
  status: "waiting" | "entered" | "cancelled";
  createdAt: string;
  position: number | null;
}

export default function QueueManager({ token }: { token: string }) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/manage/${token}/queue`)
      .then((res) => res.json())
      .then((data) => {
        setQueue(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [token, load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/manage/${token}/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const waiting = queue.filter((q) => q.status === "waiting");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-zinc-900">Virtual queue</h2>
        </div>
        <span className="text-sm text-zinc-500">
          {waiting.length} waiting
        </span>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : queue.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No one has joined the queue yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100">
          {queue.map((entry) => (
            <li
              key={entry.id}
              className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${
                entry.status !== "waiting" ? "opacity-60" : ""
              }`}
            >
              <div>
                <p className="font-medium text-zinc-900">
                  {entry.status === "waiting" && entry.position !== null && (
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {entry.position}
                    </span>
                  )}
                  {entry.name}
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ({entry.partySize} {entry.partySize === 1 ? "person" : "people"})
                  </span>
                </p>
                <p className="text-sm text-zinc-500">{entry.email}</p>
              </div>
              <div className="flex gap-2">
                {entry.status === "waiting" && (
                  <button
                    onClick={() => updateStatus(entry.id, "entered")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Let in
                  </button>
                )}
                {entry.status !== "cancelled" && (
                  <button
                    onClick={() => updateStatus(entry.id, "cancelled")}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
                  >
                    <XCircle className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
