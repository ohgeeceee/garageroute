"use client";

import type { TimeWindow } from "@/lib/weekend";

type Props = {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
};

const TABS: { value: TimeWindow; label: string }[] = [
  { value: "weekend", label: "This weekend" },
  { value: "7d", label: "Next 7 days" },
  { value: "all", label: "All upcoming" },
];

export default function WeekendTabs({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-sm">
      {TABS.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}