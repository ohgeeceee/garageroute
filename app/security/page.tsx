import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  Lock,
  ScrollText,
  Server,
  Activity,
  Bug,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Security — GarageRoute",
  description:
    "How GarageRoute keeps your account, your data, and your sales safe — and how to report an issue.",
};

const principles = [
  {
    icon: KeyRound,
    title: "Single-use seller tokens",
    body: (
      <>
        <p>
          When you post a sale, we issue you a unique, cryptographically random
          URL like{" "}
          <code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs">
            /manage/&lt;128-bit-token&gt;
          </code>
          . That URL is the only credential required to manage your sale.
        </p>
        <p>
          Treat it like a password. We strongly recommend bookmarking the page
          we email you at posting time. If you lose it, we can recover your
          listing under verified identity.
        </p>
      </>
    ),
  },
  {
    icon: Eye,
    title: "Audit-logged admin actions",
    body: (
      <p>
        Every operator action — verifying a sale, viewing a private message,
        updating settings — is written to an immutable audit log with actor,
        action, target, metadata, and IP address. We use this both for incident
        response and for trust-and-safety reviews.
      </p>
    ),
  },
  {
    icon: Lock,
    title: "Encrypted in transit and at rest",
    body: (
      <p>
        All traffic is TLS 1.2+. Database snapshots are encrypted at rest.
        Sensitive fields are hashed with industry-standard algorithms before
        storage. We rotate keys on a documented schedule.
      </p>
    ),
  },
  {
    icon: Server,
    title: "Least-privilege by default",
    body: (
      <p>
        Operator accounts have the minimum permissions needed for their role.
        Sensitive actions require step-up verification. Background checks are
        run on every team member with production access.
      </p>
    ),
  },
];

const program = [
  {
    icon: Bug,
    title: "Vulnerability disclosure",
    body: (
      <p>
        Found a security issue? Please email{" "}
        <a
          href="mailto:admin@garageroute.com"
          className="font-semibold text-brand-700 hover:underline"
        >
          admin@garageroute.com
        </a>{" "}
        with reproduction steps. We respond within 24 hours and credit reporters
        in our public hall of fame (with permission).
      </p>
    ),
  },
  {
    icon: Activity,
    title: "Status &amp; uptime",
    body: (
      <p>
        Subscribe to{" "}
        <Link
          href="/status"
          className="font-semibold text-brand-700 hover:underline"
        >
          /status
        </Link>{" "}
        for live operational status. We&apos;re committed to 99.9% availability
        and post incident reports within 48 hours.
      </p>
    ),
  },
  {
    icon: ScrollText,
    title: "Compliance roadmap",
    body: (
      <p>
        We&apos;re working toward SOC 2 Type I in 2026. For enterprise
        partnership paperwork, email{" "}
        <a
          href="mailto:admin@garageroute.com"
          className="font-semibold text-brand-700 hover:underline"
        >
          admin@garageroute.com
        </a>
        .
      </p>
    ),
  },
];

export default function SecurityPage() {
  return (
    <div className="bg-surface-50">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.30),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-success-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Security
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Trust is a feature. We build it{" "}
              <span className="text-gradient">on purpose.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-300">
              From how we issue seller credentials to how we audit our own
              team, security is woven into every layer of GarageRoute. Here&apos;s
              exactly what we do — and how to report an issue.
            </p>
          </div>
        </div>
      </section>

      {/* ============= PRINCIPLES ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Principles</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              How we keep your data safe.
            </h2>
            <p className="mt-4 text-surface-600">
              Plain English. No vague &ldquo;industry-standard&rdquo; hand-waving.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {principles.map((p) => (
              <article key={p.title} className="card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-50 text-success-700 ring-1 ring-success-100">
                  <p.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-surface-900">
                  {p.title}
                </h3>
                <div className="mt-2 space-y-3 text-sm leading-relaxed text-surface-700">
                  {p.body}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============= TRUST SIGNALS ============= */}
      <section className="border-y border-surface-200 bg-surface-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { stat: "TLS 1.2+", label: "All traffic" },
              { stat: "30 days", label: "Data export turnaround" },
              { stat: "24h", label: "Security disclosure response" },
            ].map((s) => (
              <div key={s.label} className="card p-6 text-center">
                <div className="font-display text-3xl font-bold text-surface-900">
                  {s.stat}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-surface-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= SECURITY PROGRAM ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <span className="eyebrow">Security program</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                Disclosures, status, compliance.
              </h2>
              <p className="mt-3 text-surface-600">
                How to report an issue, where to track incidents, and what
                compliance certifications we&apos;re working toward.
              </p>
              <a
                href="mailto:admin@garageroute.com"
                className="btn btn-primary mt-6"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email security team
              </a>
            </div>

            <div className="space-y-5 lg:col-span-8">
              {program.map((p) => (
                <article
                  key={p.title}
                  className="card flex items-start gap-4 p-6"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <p.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3
                      className="font-display text-lg font-bold text-surface-900"
                      dangerouslySetInnerHTML={{ __html: p.title }}
                    />
                    <div className="mt-2 text-sm leading-relaxed text-surface-700">
                      {p.body}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
