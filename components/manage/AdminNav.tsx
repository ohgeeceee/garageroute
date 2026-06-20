"use client";

import {
  LayoutDashboard,
  Package,
  Users,
  Mail,
  CreditCard,
  Truck,
  Share2,
  Settings,
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "queue", label: "Queue", icon: Users },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "reservations", label: "Reservations", icon: CreditCard },
  { id: "donations", label: "Donations", icon: Truck },
  { id: "share", label: "Share", icon: Share2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminNav({
  active,
  onChange,
  counts,
}: {
  active: string;
  onChange: (id: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <nav className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-zinc-200 bg-white px-4 sm:mx-0 sm:rounded-xl sm:border sm:px-2">
      <div className="flex min-w-max gap-1 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = counts?.[tab.id];
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    isActive ? "bg-blue-200 text-blue-800" : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
