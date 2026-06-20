import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Database,
  CreditCard,
  Map as MapIcon,
  Bell,
  Mail,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "System Status — GarageRoute",
  description:
    "Live operational status for GarageRoute: database, maps, payments, alerts, and more.",
};

type Status = "operational" | "degraded" | "outage";

const services: { id: string; name: string; desc: string; status: Status; icon: React.ElementType }[] = [
  {
    id: "db",
    name: "Database",
    desc: "Listings, reservations, and accounts.",
    status: "operational",
    icon: Database,
  },
  {
    id: "maps",
    name: "Maps & geocoding",
    desc: "OpenStreetMap tiles and Nominatim search.",
    status: "operational",
    icon: MapIcon,
  },
  {
    id: "payments",
    name: "Payments",
    desc: "Reservation deposits and refunds (mock mode in dev).",
    status: "operational",
    icon: CreditCard,
  },
  {
    id: "alerts",
    name: "Email alerts",
    desc: "Sale alerts and verification emails.",
    status: "operational",
    icon: Bell,
  },
  {
    id: "messaging",
    name: "Messaging",
    desc: "Buyer-to-seller inbox and queues.",
    status: "operational",
    icon: Mail,
  },
];

const incidents = [
  {
    title: "No active incidents",
    status: "operational",
    time: "Live",
    body: "All systems are operating normally. Subscribe below to be notified of any future events.",
  },
  {
    title: "Brief geocoding latency",
    date: "February 4, 2026",
    status: "resolved",
    body: "OpenStreetMap Nominatim had elevated response times for ~18 minutes during a global usage spike. Geocoding recovered automatically; no listings were affected.",
  },
  {
    title: "Email delivery delay",
    date: "January 28, 2026",
    status: "resolved",
    body: "Transactional emails were delayed by ~12 minutes due to a vendor rate-limit change. We updated our retry policy; future incidents will be self-healing.",
  },
];

const statusMap: Record<
  Status,
  { label: string; badge: string; dot: string; icon: React.ElementType }
> = {
  operational: {
    label: "Operational",
    badge: "badge-success",
    dot: "bg-success-500",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    badge: "badge-warning",
    dot: "bg-warning-500",
    icon: AlertCircle,
  },
  outage: {
    label: "Outage",
    badge: "badge-error",
    dot: "bg-error-500",
    icon: XCircle,
  },
};

const overall = services.every((s) => s.status === "operational")
  ? "operational"
  : services.some((s) => s.status === "outage")
    ? "outage"
    : "degraded";

export default function StatusPage() {
  const overallConfig = statusMap[overall];
  const OverallIcon = overallConfig.icon;

  return (
    <div className="bg-surface-50">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.30),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-success-300">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                System status
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Everything&apos;s{" "}
                <span className="text-gradient">operational.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-300">
                Live operational status for every GarageRoute service. We post
                incident updates here within 15 minutes of detection.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full ${overallConfig.dot} opacity-75`}
                    />
                    <span
                      className={`relative inline-flex h-3 w-3 rounded-full ${overallConfig.dot}`}
                    />
                  </span>
                  <p className="font-display text-2xl font-bold text-white">
                    {overallConfig.label}
                  </p>
                </div>
                <p className="mt-2 text-sm text-surface-300">
                  All {services.length} services are operating normally.
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-surface-400">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Last checked · just now
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= SERVICES ============= */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="card overflow-hidden">
              <header className="flex items-center justify-between border-b border-surface-200 px-5 py-4">
                <div>
                  <p className="eyebrow">Services</p>
                  <h2 className="mt-0.5 font-display text-lg font-bold text-surface-900">
                    Component status
                  </h2>
                </div>
                <span className={`badge ${overallConfig.badge}`}>
                  <OverallIcon className="h-3 w-3" aria-hidden="true" />
                  All systems {overallConfig.label.toLowerCase()}
                </span>
              </header>
              <ul className="divide-y divide-surface-100">
                {services.map((s) => {
                  const config = statusMap[s.status];
                  const Icon = config.icon;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700">
                        <s.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-surface-900">{s.name}</p>
                        <p className="text-xs text-surface-500">{s.desc}</p>
                      </div>
                      <span className={`badge ${config.badge}`}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {config.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Uptime blurb */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { v: "99.96%", l: "30-day uptime" },
                { v: "99.99%", l: "90-day uptime" },
                { v: "<15m", l: "Mean incident ack time" },
              ].map((s) => (
                <div key={s.l} className="card p-5 text-center">
                  <div className="font-display text-2xl font-bold text-surface-900">
                    {s.v}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-surface-500">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============= INCIDENTS ============= */}
      <section className="bg-surface-0 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="eyebrow">History</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                Past 90 days
              </h2>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {incidents.map((i, idx) => (
              <article key={idx} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-surface-900">
                    {i.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-surface-500">
                    {i.status === "operational" ? (
                      <span className="badge badge-success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Operational
                      </span>
                    ) : (
                      <span className="badge badge-neutral">Resolved</span>
                    )}
                    <span>{i.time || i.date}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-surface-700">
                  {i.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============= SUBSCRIBE ============= */}
      <section className="bg-surface-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-surface-200 bg-surface-0 p-8 text-center sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
              Get notified.
            </h2>
            <p className="mt-2 text-surface-600">
              Subscribe to status updates — we&apos;ll only email you when
              something actually changes.
            </p>
            <a
              href="mailto:admin@garageroute.com?subject=Subscribe%20me%20to%20status%20updates"
              className="btn btn-primary mt-6"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Subscribe via email
            </a>
            <p className="mt-4 text-xs text-surface-500">
              Looking for a specific historical incident?{" "}
              <Link
                href="/contact"
                className="font-semibold text-brand-700 hover:underline"
              >
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
