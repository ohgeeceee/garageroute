"use client";

import { Package, Users, Mail, CreditCard, TrendingUp, DollarSign } from "lucide-react";

interface Props {
  sale: {
    items: { sold?: boolean; price?: number }[];
  };
  queueCount?: number;
  messageCount?: number;
  reservationCount?: number;
  reservationTotal?: number;
}

export default function DashboardStats({
  sale,
  queueCount = 0,
  messageCount = 0,
  reservationCount = 0,
  reservationTotal = 0,
}: Props) {
  const listed = sale.items.length;
  const sold = sale.items.filter((i) => i.sold).length;
  const available = listed - sold;
  const listedValue = sale.items.reduce((sum, i) => sum + (i.price || 0), 0);

  const cards = [
    {
      label: "Items listed",
      value: listed,
      sub: `${available} available · ${sold} sold`,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Listed value",
      value: `$${listedValue.toFixed(2)}`,
      sub: "Total asking price",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "In queue",
      value: queueCount,
      sub: "Buyers waiting",
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Messages",
      value: messageCount,
      sub: "Unread inquiries",
      icon: Mail,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Reservations",
      value: reservationCount,
      sub: `$${reservationTotal.toFixed(2)} in deposits`,
      icon: CreditCard,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      label: "Sell-through",
      value: listed > 0 ? `${Math.round((sold / listed) * 100)}%` : "0%",
      sub: `${sold} of ${listed} sold`,
      icon: DollarSign,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{card.value}</p>
            </div>
            <div className={`rounded-lg ${card.bg} p-2 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-zinc-500">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
