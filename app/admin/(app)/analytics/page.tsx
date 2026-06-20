"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";

type Analytics = {
  totals: { sales: number; items: number; users: number; recentSales: number };
  series: { date: string; label: string; sales: number }[];
  itemsByCategory: { category: string; count: number }[];
  salesByState: { state: string; count: number }[];
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/admin/login"; return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-surface-400" /></div>;
  }
  if (!data) return <div className="card p-6 text-sm text-error-700">Failed to load analytics.</div>;

  const maxBar = Math.max(1, ...data.series.map((d) => d.sales));
  const maxCat = Math.max(1, ...data.itemsByCategory.map((c) => c.count));
  const maxState = Math.max(1, ...data.salesByState.map((s) => s.count));

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Insights</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Analytics</h2>
        <p className="mt-1 text-sm text-surface-600">
          Platform-wide trends over the last 30 days.
        </p>
      </div>

      {/* Totals row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Total label="Sales (all time)" value={data.totals.sales} />
        <Total label="New this week" value={data.totals.recentSales} highlight />
        <Total label="Items listed" value={data.totals.items} />
        <Total label="Buyer subscribers" value={data.totals.users} />
      </div>

      {/* 30-day trend */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow">Trend</p>
            <h3 className="mt-0.5 text-base font-semibold text-surface-900">Sales per day — last 30 days</h3>
          </div>
          <TrendingUp className="h-5 w-5 text-brand-600" />
        </div>
        <div className="flex h-48 items-end gap-1">
          {data.series.map((d) => {
            const h = Math.max(2, (d.sales / maxBar) * 100);
            return (
              <div key={d.date} className="group flex flex-1 flex-col items-center">
                <div className="relative w-full" style={{ height: "100%" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-sm bg-gradient-to-t from-brand-600 to-brand-400 transition-all group-hover:from-brand-700 group-hover:to-brand-500"
                    style={{ height: `${h}%`, minHeight: 3 }}
                    title={`${d.label}: ${d.sales} sales`}
                  />
                  {d.sales > 0 && (
                    <div className="absolute -top-4 left-1/2 hidden -translate-x-1/2 rounded bg-surface-900 px-1 py-0.5 text-[9px] font-semibold text-white group-hover:block">
                      {d.sales}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-surface-500 font-medium">
          <span>{data.series[0]?.label}</span>
          <span>{data.series[Math.floor(data.series.length / 2)]?.label}</span>
          <span>{data.series[data.series.length - 1]?.label}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Categories */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Inventory</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">Items by category</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-surface-400" />
          </div>
          {data.itemsByCategory.length === 0 ? (
            <p className="text-sm text-surface-500">No items yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.itemsByCategory.map((c) => {
                const pct = Math.round((c.count / maxCat) * 100);
                return (
                  <li key={c.category}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-medium text-surface-800">{c.category}</span>
                      <span className="text-xs font-semibold text-surface-500">{c.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* By state */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Geography</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">Sales by state</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-surface-400" />
          </div>
          {data.salesByState.length === 0 ? (
            <p className="text-sm text-surface-500">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.salesByState.map((s) => {
                const pct = Math.round((s.count / maxState) * 100);
                return (
                  <li key={s.state}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-medium text-surface-800">{s.state}</span>
                      <span className="text-xs font-semibold text-surface-500">{s.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full bg-success-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Total({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`card p-5 ${highlight ? "border-brand-200 bg-brand-50/50" : ""}`}>
      <p className="text-sm font-medium text-surface-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${highlight ? "text-brand-700" : "text-surface-900"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
