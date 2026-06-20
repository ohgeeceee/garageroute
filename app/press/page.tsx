import {
  Download,
  Mail,
  Palette,
  Newspaper,
  Image as ImageIcon,
  Award,
} from "lucide-react";

export const metadata = {
  title: "Press — GarageRoute",
  description:
    "Press kit, brand assets, recent coverage, and how to reach our communications team.",
};

const recentCoverage = [
  {
    outlet: "Saturday Magazine",
    quote:
      "GarageRoute is doing for garage sales what OpenTable did for restaurants.",
    date: "March 2026",
  },
  {
    outlet: "Local Commerce Weekly",
    quote:
      "A neighborhood marketplace that's actually built for neighborhoods.",
    date: "February 2026",
  },
  {
    outlet: "Side Hustle Daily",
    quote:
      "The fastest way to turn Saturday-morning clutter into a sold-out sale.",
    date: "January 2026",
  },
];

const brandAssets = [
  {
    label: "Primary logo (SVG, PNG)",
    size: "12 MB · ZIP",
    desc: "Full GarageRoute wordmark with and without logomark.",
  },
  {
    label: "Logomark only",
    size: "1.4 MB · SVG + PNG",
    desc: "For favicons, social avatars, and small placements.",
  },
  {
    label: "Brand colors and typography",
    size: "320 KB · PDF",
    desc: "Official palette, type system, and usage rules.",
  },
  {
    label: "Product screenshots",
    size: "8 MB · ZIP",
    desc: "App and admin console screenshots in 2x resolution.",
  },
];

const facts = [
  { label: "Founded", value: "2025" },
  { label: "Headquarters", value: "Denver, CO" },
  { label: "Active markets", value: "12 metros" },
  { label: "Sales hosted", value: "12,400+" },
  { label: "Items rehomed", value: "84,000" },
  { label: "Team size", value: "9 people" },
];

export default function PressPage() {
  return (
    <div className="bg-surface-50">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.30),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300">
                <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                Press &amp; media
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                News, resources, and{" "}
                <span className="text-gradient">brand assets</span> for media.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-300">
                Need a quote, a logo, or a screenshot for a story? You&apos;re
                in the right place. Reach out and we&apos;ll get back to you
                within one business day.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="mailto:press@garageroute.com" className="btn btn-primary">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Contact press team
                </a>
                <a href="#assets" className="btn btn-secondary !bg-white/10 !border-white/15 !text-white hover:!bg-white/15">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download press kit
                </a>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="card overflow-hidden !bg-surface-0 p-8">
                <p className="eyebrow">Quick facts</p>
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  {facts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-surface-500">
                        {f.label}
                      </dt>
                      <dd className="mt-1 font-display text-xl font-bold text-surface-900">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= RECENT COVERAGE ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Recent coverage</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              What people are saying.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentCoverage.map((c) => (
              <figure key={c.quote} className="card p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700">
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  {c.outlet}
                </div>
                <blockquote className="mt-3 font-display text-base leading-relaxed text-surface-800">
                  &ldquo;{c.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-3 text-xs text-surface-500">
                  {c.date}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============= BRAND ASSETS ============= */}
      <section id="assets" className="border-y border-surface-200 bg-surface-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">Press kit</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                Brand assets &amp; guidelines.
              </h2>
              <p className="mt-2 max-w-2xl text-surface-600">
                Use these in any story about GarageRoute. No permission needed
                for editorial coverage.
              </p>
            </div>
            <a
              href="mailto:press@garageroute.com?subject=Press%20kit%20request"
              className="btn btn-secondary btn-sm"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Email me the kit
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {brandAssets.map((a) => (
              <div
                key={a.label}
                className="card flex items-start gap-4 p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  {a.label === "Product screenshots" ? (
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Palette className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold text-surface-900">
                    {a.label}
                  </h3>
                  <p className="mt-1 text-sm text-surface-600">{a.desc}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-surface-500">
                    {a.size}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm shrink-0"
                  disabled
                  title="Email us to receive the file"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Get
                </button>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-surface-500">
            Looking for a custom asset or specific spokesperson? Email{" "}
            <a
              href="mailto:press@garageroute.com"
              className="font-semibold text-brand-700 hover:underline"
            >
              press@garageroute.com
            </a>
            .
          </p>
        </div>
      </section>

      {/* ============= CONTACT ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-surface-200 bg-surface-50 p-8 sm:p-12">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="eyebrow">Press contact</span>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-surface-900">
                  Reach the right person fast.
                </h2>
                <p className="mt-4 text-surface-700">
                  For interviews, statements, fact-checking, or anything that
                  can&apos;t wait, email us directly. We respond within one
                  business day, often much faster.
                </p>
              </div>
              <div className="space-y-3">
                <ContactRow
                  icon={Mail}
                  label="General press"
                  value="press@garageroute.com"
                />
                <ContactRow
                  icon={Mail}
                  label="Partnerships"
                  value="partners@garageroute.com"
                />
                <ContactRow
                  icon={Mail}
                  label="Investor relations"
                  value="ir@garageroute.com"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <a
      href={`mailto:${value}`}
      className="card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-card-hover"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          {label}
        </p>
        <p className="truncate font-medium text-surface-900">{value}</p>
      </div>
    </a>
  );
}
