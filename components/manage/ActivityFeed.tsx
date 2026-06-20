"use client";

import { Package, Users, Mail, CreditCard, Truck } from "lucide-react";

interface Props {
  sale: {
    items: { name: string; sold?: boolean; updatedAt?: string }[];
  };
  messages: { senderName: string; content: string; createdAt: string }[];
  queue: { name: string; status: string; createdAt: string }[];
  reservations: { buyerName: string; item: { name: string }; status: string; createdAt: string }[];
}

const icons: Record<string, React.ElementType> = {
  item: Package,
  queue: Users,
  message: Mail,
  reservation: CreditCard,
  donation: Truck,
};

export default function ActivityFeed({ sale, messages, queue, reservations }: Props) {
  const activities = [
    ...sale.items
      .filter((i) => i.sold)
      .map((i) => ({
        type: "item",
        text: `Item marked sold: ${i.name}`,
        time: i.updatedAt || new Date().toISOString(),
      })),
    ...messages.map((m) => ({
      type: "message",
      text: `Message from ${m.senderName}`,
      time: m.createdAt,
    })),
    ...queue
      .filter((q) => q.status === "waiting")
      .map((q) => ({
        type: "queue",
        text: `${q.name} joined the virtual queue`,
        time: q.createdAt,
      })),
    ...reservations.map((r) => ({
      type: "reservation",
      text: `${r.buyerName} reserved ${r.item.name}`,
      time: r.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
        <p className="text-sm text-zinc-500">No recent activity yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h3 className="font-semibold text-zinc-900">Recent activity</h3>
      <ul className="mt-4 space-y-3">
        {activities.map((a, i) => {
          const Icon = icons[a.type] || Package;
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <div className="rounded-lg bg-zinc-100 p-1.5 text-zinc-500">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-zinc-900">{a.text}</p>
                <p className="text-xs text-zinc-400">
                  {new Date(a.time).toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
