"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Users,
  Mail,
  CreditCard,
  Bell,
  TrendingUp,
  TrendingDown,
  BadgeCheck,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Search,
  Filter,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

type Overview = {
  counts: {
    sales: number;
    items: number;
    queue: number;
    messages: number;
    reservations: number;
    alerts: number;
    pendingVerifications: number;
    pendingSellerVerifications: number;
  };
  series: { date: string; label: string; sales: number }[];
  topCategories: { category: string; count: number }[];
  recentSales: {
    id: string;
    title: string;
    seller: string;
    city: string;
    state: string;
    verified: boolean;
    createdAt: string;
  }[];
  recentMessages: {
    id: string;
    senderName: string;
    content: string;
    createdAt: string;
    sale: { id: string; title: string };
  }[];
  recentSellerVerifications: {
    id: string;
    notes: string;
    documentMime: string;
    documentName: string;
    submittedAt: string;
    user: { id: string; name: string; email: string; city: string; state: string };
  }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/admin/login";
          return null;
        }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => setError("Unable to load platform overview."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="card p-6 text-sm text-error-700 bg-error-50 border-error-100">
        {error || "No data."}
      </div>
    );
  }

  const c = data.counts;
  const peakDay = data.series.reduce(
    (max, d) => (d.sales > max.sales ? d : max),
    data.series[0]
  );
  const totalThisWeek = data.series.reduce((s, d) => s + d.sales, 0);
  const maxBar = Math.max(1, ...data.series.map((d) => d.sales));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Overview</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">
            Platform health at a glance
          </h2>
          <p className="mt-1 text-sm text-surface-600">
            Listings, activity, and pending actions across GarageRoute.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/seller-verifications" className="btn btn-secondary btn-sm">
            <ShieldCheck className="h-4 w-4" />
            Seller verifications
            {c.pendingSellerVerifications > 0 && (
              <span className="badge badge-warning ml-1 !py-0">{c.pendingSellerVerifications}</span>
            )}
          </Link>
          <Link href="/admin/verifications" className="btn btn-secondary btn-sm">
            <BadgeCheck className="h-4 w-4" />
            Sale verifications
            {c.pendingVerifications > 0 && (
              <span className="badge badge-warning ml-1 !py-0">{c.pendingVerifications}</span>
            )}
          </Link>
          <Link href="/admin/sales" className="btn btn-primary btn-sm">
            <Package className="h-4 w-4" />
            Manage sales
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          label="Total sales"
          value={c.sales}
          delta={c.pendingVerifications}
          deltaLabel="pending review"
          icon={Package}
          tone="brand"
        />
        <KPI
          label="Items listed"
          value={c.items}
          delta={Math.round(c.items / Math.max(1, c.sales))}
          deltaLabel="avg per sale"
          icon={ShoppingBag}
          tone="info"
        />
        <KPI
          label="Active alerts"
          value={c.alerts}
          deltaLabel="buyer subscriptions"
          icon={Bell}
          tone="warning"
        />
        <KPI
          label="Reservations"
          value={c.reservations}
          delta={c.queue}
          deltaLabel="in queue now"
          icon={CreditCard}
          tone="success"
        />
      </div>

      {/* Pending action notifications — only show when there's work to do */}
      {(c.pendingSellerVerifications > 0 || c.pendingVerifications > 0) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {c.pendingSellerVerifications > 0 && (
            <Link
              href="/admin/seller-verifications"
              className="card group flex items-center gap-4 border-warning-200 bg-warning-50/60 p-4 transition hover:border-warning-300 hover:bg-warning-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-900">
                  {c.pendingSellerVerifications} seller {c.pendingSellerVerifications === 1 ? "verification" : "verifications"} pending
                </p>
                <p className="text-xs text-surface-600">ID documents waiting for review</p>
              </div>
              <span className="badge badge-warning">
                <Clock className="h-3 w-3" />
                Action needed
              </span>
              <ArrowUpRight className="h-4 w-4 text-surface-400 group-hover:text-warning-700" />
            </Link>
          )}
          {c.pendingVerifications > 0 && (
            <Link
              href="/admin/verifications"
              className="card group flex items-center gap-4 border-info-200 bg-info-50/60 p-4 transition hover:border-info-300 hover:bg-info-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-100 text-info-600">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-900">
                  {c.pendingVerifications} sale {c.pendingVerifications === 1 ? "verification" : "verifications"} pending
                </p>
                <p className="text-xs text-surface-600">Listings waiting for review</p>
              </div>
              <span className="badge badge-info">
                <Clock className="h-3 w-3" />
                Review
              </span>
              <ArrowUpRight className="h-4 w-4 text-surface-400 group-hover:text-info-600" />
            </Link>
          )}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales trend */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Listings</p>
              <h3 className="mt-1 text-base font-semibold text-surface-900">
                Sales created — last 7 days
              </h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-surface-900">{totalThisWeek}</div>
              <div className="text-xs text-surface-500">
                this week · peak {peakDay?.sales ?? 0} on {peakDay?.label}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="mt-6 flex h-40 items-end gap-2">
            {data.series.map((d, i) => {
              const h = Math.max(2, (d.sales / maxBar) * 100);
              return (
                <div key={d.date} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t-md bg-brand-100 transition-all group-hover:bg-brand-200"
                      style={{ height: `${h}%`, minHeight: 4 }}
                      title={`${d.label}: ${d.sales} sales`}
                      aria-label={`${d.label}: ${d.sales} sales`}
                    />
                    {d.sales > 0 && (
                      <div className="absolute -top-5 left-1/2 hidden -translate-x-1/2 rounded bg-surface-900 px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:block">
                        {d.sales}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-surface-500 font-medium">
                    {d.label.split(" ")[1]}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top categories */}
        <section className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Inventory</p>
              <h3 className="mt-1 text-base font-semibold text-surface-900">Top categories</h3>
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {data.topCategories.length === 0 ? (
              <li className="text-sm text-surface-500">No items yet.</li>
            ) : (
              data.topCategories.map((c) => {
                const pct = Math.round((c.count / Math.max(1, data.topCategories[0].count)) * 100);
                return (
                  <li key={c.category} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-surface-800">{c.category}</span>
                      <span className="text-xs font-semibold text-surface-500">{c.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent sales */}
        <section className="card overflow-hidden lg:col-span-2">
          <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
            <div>
              <p className="eyebrow">Activity</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">Recent sales</h3>
            </div>
            <Link href="/admin/sales" className="text-xs font-semibold text-brand-700 hover:underline">
              View all →
            </Link>
          </header>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Seller</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th className="text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/sales/${s.id}`} className="font-semibold text-surface-900 hover:text-brand-700">
                        {s.title}
                      </Link>
                    </td>
                    <td className="text-surface-700">{s.seller}</td>
                    <td className="text-surface-600">
                      {s.city}, {s.state}
                    </td>
                    <td>
                      {s.verified ? (
                        <span className="badge badge-success">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="text-right text-xs text-surface-500">
                      {relativeTime(s.createdAt)}
                    </td>
                  </tr>
                ))}
                {data.recentSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-surface-500 py-6">
                      No sales yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent messages */}
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
            <div>
              <p className="eyebrow">Inbox</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">Recent messages</h3>
            </div>
            <Link href="/admin/messages" className="text-xs font-semibold text-brand-700 hover:underline">
              View all →
            </Link>
          </header>
          <ul className="divide-y divide-surface-100">
            {data.recentMessages.length === 0 ? (
              <li className="p-5 text-sm text-surface-500">No messages yet.</li>
            ) : (
              data.recentMessages.map((m) => (
                <li key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-surface-900">{m.senderName}</p>
                    <span className="text-[10px] text-surface-500 whitespace-nowrap">
                      {relativeTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-surface-500">
                    re: <span className="font-medium text-surface-700">{m.sale.title}</span>
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-surface-700">{m.content}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Recent seller verifications */}
      {data.recentSellerVerifications.length > 0 && (
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
            <div>
              <p className="eyebrow">Identity</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">Pending seller verifications</h3>
            </div>
            <Link href="/admin/seller-verifications" className="text-xs font-semibold text-brand-700 hover:underline">
              Review queue →
            </Link>
          </header>
          <ul className="divide-y divide-surface-100">
            {data.recentSellerVerifications.map((v) => (
              <li key={v.id} className="flex items-center gap-4 p-4 hover:bg-surface-50 transition">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs uppercase">
                  {v.user.name?.[0] ?? v.user.email[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-surface-900">{v.user.name}</p>
                    <span className="badge badge-warning !py-0">
                      <Clock className="h-3 w-3" /> Awaiting
                    </span>
                  </div>
                  <p className="truncate text-xs text-surface-500">
                    {v.user.email}
                    {v.user.city ? ` · ${v.user.city}${v.user.state ? `, ${v.user.state}` : ""}` : ""}
                  </p>
                  {v.notes && (
                    <p className="mt-1 line-clamp-1 text-xs text-surface-700">{v.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-surface-500">
                  {v.documentMime ? (
                    v.documentMime.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />
                  ) : null}
                  <span className="whitespace-nowrap">{relativeTime(v.submittedAt)}</span>
                </div>
                <Link
                  href={`/admin/seller-verifications`}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* System status strip */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="eyebrow">System</p>
            <h3 className="mt-0.5 text-base font-semibold text-surface-900">Operational health</h3>
          </div>
          <Link href="/admin/settings" className="text-xs font-semibold text-brand-700 hover:underline">
            Settings →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusRow label="API" status="ok" detail="All endpoints responding" />
          <StatusRow label="Database" status="ok" detail="SQLite · healthy" />
          <StatusRow label="Map provider" status="ok" detail="OpenStreetMap" />
          <StatusRow label="Payments" status="warn" detail="Stripe in mock mode" />
          <StatusRow label="Storage" status="ok" detail="Local disk · STORAGE_DRIVER=local" />
          <StatusRow label="Upload scanner" status="warn" detail="clamav not detected — install before launch" />
        </div>
      </section>
    </div>
  );
}

/* ---------- Internal sub-components ---------- */

function KPI({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  icon: React.ElementType;
  tone: "brand" | "success" | "warning" | "info";
}) {
  const toneClasses: Record<string, string> = {
    brand:   "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    info:    "bg-info-50 text-info-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-surface-900">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {deltaLabel && (
        <p className="mt-2 text-xs text-surface-500">
          {delta !== undefined && (
            <span className="font-semibold text-surface-700">{delta.toLocaleString()} </span>
          )}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: "ok" | "warn" | "down";
  detail: string;
}) {
  const config = {
    ok:   { dot: "bg-success-500", badge: "badge-success", icon: CheckCircle2, text: "Operational" },
    warn: { dot: "bg-warning-500", badge: "badge-warning", icon: AlertCircle,  text: "Degraded"     },
    down: { dot: "bg-error-500",   badge: "badge-error",   icon: XCircle,      text: "Outage"       },
  }[status];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-surface-200 p-3">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${config.dot} animate-pulse-soft`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-surface-900">{label}</p>
          <span className={`badge ${config.badge}`}>
            <Icon className="h-3 w-3" />
            {config.text}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-surface-500">{detail}</p>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
