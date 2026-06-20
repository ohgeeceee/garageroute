import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Heart,
  Home,
  Laptop,
  Plane,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

export const metadata = {
  title: "Careers — GarageRoute",
  description:
    "Help us build the operating system for local weekend commerce. Open roles, culture, and how we hire.",
};

const roles = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    bullets: [
      "Own end-to-end features across Next.js, Prisma, and our growing mobile stack.",
      "Comfortable making product calls, not just writing code.",
    ],
  },
  {
    title: "Trust & Safety Lead",
    team: "Operations",
    location: "Remote (US)",
    type: "Full-time",
    bullets: [
      "Lead the team that reviews listings, verifies sellers, and handles escalations.",
      "Build the playbook for fraud, abuse, and edge cases at marketplace scale.",
    ],
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote (US)",
    type: "Full-time",
    bullets: [
      "Craft the end-to-end experience — from logomark to admin dashboards.",
      "Strong systems thinker with a taste for clean, quiet UI.",
    ],
  },
  {
    title: "Growth Marketing Manager",
    team: "Marketing",
    location: "Denver, CO or Remote",
    type: "Full-time",
    bullets: [
      "Own top-of-funnel for buyers and sellers in our launch markets.",
      "Comfortable with SEO, lifecycle, and a small paid budget.",
    ],
  },
];

const benefits = [
  {
    icon: Heart,
    title: "Health, dental, vision",
    desc: "Premium plans covered at 100% for you and 80% for dependents.",
  },
  {
    icon: Home,
    title: "Home office stipend",
    desc: "$1,500 to set up your workspace, plus a monthly internet reimbursement.",
  },
  {
    icon: Plane,
    title: "Unlimited PTO",
    desc: "Real time off, with a 3-week minimum. We mean it.",
  },
  {
    icon: TrendingUp,
    title: "Equity",
    desc: "Every employee is an owner. Standard 4-year vest with a 1-year cliff.",
  },
  {
    icon: Laptop,
    title: "Hardware of your choice",
    desc: "M-series MacBook Pro, or the equivalent. Monitors shipped to your door.",
  },
  {
    icon: Users,
    title: "Quarterly retreats",
    desc: "The whole team gets together in person four times a year.",
  },
];

const principles = [
  {
    title: "Ship small, ship often",
    desc: "We deploy dozens of times a week. Small changes compound.",
  },
  {
    title: "Customer obsession",
    desc: "Every quarter we ride along with a real seller. It's our north star.",
  },
  {
    title: "Default to writing",
    desc: "Decisions, plans, retros — they live in documents, not in meetings.",
  },
  {
    title: "Strong opinions, loosely held",
    desc: "We debate hard, then commit fully. Once we decide, we're a team.",
  },
];

export default function CareersPage() {
  return (
    <div className="bg-surface-50">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.30),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                We&apos;re hiring
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Help us make every Saturday morning{" "}
                <span className="text-gradient">count.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-300">
                We&apos;re a small, operator-led team building the marketplace
                we wished existed. If you love local commerce, clean UI, and
                shipping real product — you&apos;ll fit right in.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#open-roles" className="btn btn-primary">
                  See open roles
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link
                  href="/about"
                  className="btn btn-secondary !bg-white/10 !border-white/15 !text-white hover:!bg-white/15"
                >
                  About the team
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { v: "9", l: "People on the team" },
                  { v: "4.7", l: "Glassdoor rating" },
                  { v: "Remote", l: "First, with quarterly retreats" },
                  { v: "Series", l: "Pre-seed, growing into Seed" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                  >
                    <div className="font-display text-3xl font-bold text-white">
                      {s.v}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-surface-400">
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= PRINCIPLES ============= */}
      <section className="border-b border-surface-200 bg-surface-0 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">How we work</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              Four principles guide how we build.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <article key={p.title} className="card p-6">
                <div className="font-display text-2xl font-bold text-brand-600">
                  0{i + 1}
                </div>
                <h3 className="mt-2 font-display text-base font-bold text-surface-900">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  {p.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============= OPEN ROLES ============= */}
      <section id="open-roles" className="bg-surface-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">Open roles</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                {roles.length} open positions
              </h2>
              <p className="mt-2 text-surface-600">
                Don&apos;t see your role? We always want to hear from
                exceptional people — reach out below.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {roles.map((r) => (
              <article
                key={r.title}
                className="card card-hover flex flex-wrap items-start justify-between gap-4 p-6 sm:flex-nowrap"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-surface-900">
                      {r.title}
                    </h3>
                    <span className="badge badge-brand">{r.team}</span>
                    <span className="badge badge-neutral">{r.type}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-surface-600">
                    {r.location}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-surface-700">
                    {r.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500"
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href={`mailto:admin@garageroute.com?subject=Application: ${encodeURIComponent(
                    r.title
                  )}`}
                  className="btn btn-primary shrink-0"
                >
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                  Apply
                </a>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-surface-200 bg-surface-0 p-8 text-center">
            <p className="text-sm text-surface-700">
              Not the right fit today? Email{" "}
              <a
                href="mailto:admin@garageroute.com"
                className="font-semibold text-brand-700 hover:underline"
              >
                admin@garageroute.com
              </a>{" "}
              with what you&apos;d love to work on. We read every note.
            </p>
          </div>
        </div>
      </section>

      {/* ============= BENEFITS ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Benefits</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              Everything you need to do your best work.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <article key={b.title} className="card card-hover p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-50 text-success-700 ring-1 ring-success-100">
                  <b.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-base font-bold text-surface-900">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  {b.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
