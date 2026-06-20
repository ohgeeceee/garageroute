import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Leaf,
  ShieldCheck,
  Users,
  Sparkles,
  Target,
  Heart,
  Wrench,
} from "lucide-react";

export const metadata = {
  title: "About — GarageRoute",
  description:
    "GarageRoute is the operating system for local weekend commerce. Our mission is to make every garage sale searchable, plannable, and trustworthy.",
};

const stats = [
  { value: "12,400+", label: "Sales hosted" },
  { value: "84,000", label: "Items rehomed" },
  { value: "31,200 kg", label: "Waste diverted" },
  { value: "97%", label: "Buyers would recommend" },
];

const values = [
  {
    icon: Target,
    title: "Show up informed",
    body: "A Saturday drive should never be a gamble. We surface photos, prices, and conditions before you turn the key.",
  },
  {
    icon: ShieldCheck,
    title: "Earn trust by default",
    body: "Verified badges, secure seller tokens, and an audit log for every operator action. Trust is a feature, not a footnote.",
  },
  {
    icon: Leaf,
    title: "Every item counts",
    body: "Resale is the most climate-friendly shopping most people do all week. We track the impact so you can see it.",
  },
  {
    icon: Heart,
    title: "Built for neighborhoods",
    body: "We design for Saturday mornings on Maple Street — not generic classifieds. Local first, always.",
  },
];

const team = [
  {
    name: "Founder & CEO",
    role: "Product & vision",
    bio: "Built GarageRoute after losing too many Saturdays to dead-end drives.",
    initials: "JR",
  },
  {
    name: "Head of Engineering",
    role: "Platform & infrastructure",
    bio: "Keeps the maps, queues, and payments humming at every peak hour.",
    initials: "AM",
  },
  {
    name: "Head of Trust & Safety",
    role: "Verifications & support",
    bio: "Leads the team that reviews listings and supports sellers in real time.",
    initials: "DK",
  },
  {
    name: "Head of Design",
    role: "Brand & product design",
    bio: "Crafts the feel of the marketplace — from the logomark to the dashboards.",
    initials: "SO",
  },
];

const investors = [
  "Angels from the local startup community",
  "Operator-led pre-seed round",
  "Strategic angels from real estate & marketplaces",
];

export default function AboutPage() {
  return (
    <div className="bg-surface-50">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.30),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              About GarageRoute
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              We&apos;re building the{" "}
              <span className="text-gradient">operating system</span> for local
              weekend commerce.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-300 sm:text-xl">
              GarageRoute helps neighborhoods discover, plan, and trust the
              sales happening right outside their door. We&apos;re a small,
              operator-led team on a mission to make every item find its next
              home.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sales" className="btn btn-primary">
                Browse sales
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/careers"
                className="btn btn-secondary !bg-white/10 !border-white/15 !text-white hover:!bg-white/15"
              >
                Join the team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============= STATS STRIP ============= */}
      <section className="border-y border-surface-200 bg-surface-0">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <dt className="text-xs font-semibold uppercase tracking-wider text-surface-500">
                  {s.label}
                </dt>
                <dd className="mt-1 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============= OUR STORY ============= */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-4">
            <span className="eyebrow">Our story</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              From a single weekend frustration to a marketplace.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-surface-700 lg:col-span-8">
            <p>
              GarageRoute started with a Saturday-morning frustration. After
              three straight weekends of driving to sales that didn&apos;t exist
              anymore — or had nothing we wanted — we decided the problem
              wasn&apos;t supply. It was information.
            </p>
            <p>
              Most garage-sale sites stop at a title, a few photos, and a pin
              on a map. That&apos;s helpful, but it leaves buyers guessing. They
              don&apos;t know if the drive is worth it, whether the items they
              want are still there, or how to fit multiple sales into one
              morning.
            </p>
            <p>
              So we built the tool we wished existed: searchable pre-sale
              inventory, optimized weekend routes, verified sellers, and
              real-time updates from the curb. Today, GarageRoute powers
              thousands of sales across dozens of neighborhoods — and we&apos;re
              just getting started.
            </p>
          </div>
        </div>
      </section>

      {/* ============= VALUES ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">What we believe</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              Four principles guide every decision.
            </h2>
            <p className="mt-4 text-surface-600">
              They&apos;re not slogans — they&apos;re the test we apply to every
              feature we ship.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <article key={v.title} className="card card-hover p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <v.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-surface-900">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  {v.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============= TEAM ============= */}
      <section className="border-y border-surface-200 bg-surface-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <span className="eyebrow">Team</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                A small team that ships.
              </h2>
              <p className="mt-3 text-surface-600">
                We&apos;re a remote-first group of operators, engineers, and
                designers. We&apos;ve all lost Saturdays to bad garage-sale
                listings — and we&apos;re determined nobody else has to.
              </p>
            </div>
            <Link
              href="/careers"
              className="btn btn-secondary btn-sm"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              See open roles
            </Link>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <article key={m.name} className="card p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-xl font-bold text-white shadow-brand">
                  {m.initials}
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-surface-900">
                  {m.name}
                </h3>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
                  {m.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-surface-600">
                  {m.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============= INVESTORS / BACKED BY ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 rounded-3xl border border-surface-200 bg-surface-50 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <span className="eyebrow">Backed by</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                Operator-led from day one.
              </h2>
              <p className="mt-4 leading-relaxed text-surface-700">
                We raised a small, focused pre-seed from operators and angels
                who&apos;ve built and scaled local-marketplace businesses. We
                answer to people who&apos;ve actually done the work.
              </p>
              <ul className="mt-6 space-y-2.5">
                {investors.map((i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-surface-700"
                  >
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-success-600"
                      aria-hidden="true"
                    />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {["Maple", "Northside", "Lakeshore", "Birchwood", "Heritage", "Foxglove"].map(
                (name) => (
                  <div
                    key={name}
                    className="flex h-20 items-center justify-center rounded-xl border border-surface-200 bg-surface-0 px-3 text-center font-display text-base font-semibold text-surface-500"
                  >
                    {name}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============= CTA ============= */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-surface-900 px-8 py-14 text-center text-white sm:px-12 lg:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.15),transparent_45%)]"
            />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30">
                <Compass className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                See what&apos;s happening this weekend.
              </h2>
              <p className="mt-3 text-surface-300">
                Browse sales near you, plan your route, and grab the best
                deals before anyone else.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link href="/sales" className="btn btn-primary">
                  Browse sales
                </Link>
                <Link
                  href="/post"
                  className="btn btn-secondary !bg-white/10 !border-white/15 !text-white hover:!bg-white/15"
                >
                  <Wrench className="h-4 w-4" aria-hidden="true" />
                  Post your sale
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
