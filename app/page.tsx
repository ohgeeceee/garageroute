import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Suspense } from "react";
import { headers } from "next/headers";
import {
  Search,
  Map as MapIcon,
  Clock,
  ArrowRight,
  Leaf,
  Package,
  Zap,
  Star,
  CheckCircle,
  Bell,
  Recycle,
  Wallet2,
  Sparkles,
  BadgeCheck,
  Calendar,
} from "lucide-react";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/structured-data";
import SaleCard from "@/components/SaleCard";
import AlertSignup from "@/components/AlertSignup";
import { HeroSearch } from "@/components/landing/HeroSearch";
import { StatCounter } from "@/components/landing/StatCounter";
import StateHero from "@/components/StateHero";
import StatePicker from "@/components/StatePicker";
import StateSignupForm from "@/components/StateSignupForm";
import { prisma } from "@/lib/prisma";
import { fetchSales } from "@/lib/api";
import type { Sale, Item } from "@/data/sales";

// Revalidate the bare-domain landing page every 60s. The state-subdomain
// branch and HeroSearch client component render fine under ISR.
export const revalidate = 60;

// Fields the home-page SaleCard + stats actually read. Keep in sync with
// components/SaleCard.tsx. `sellerUser` joins User.verifiedSeller.
const HOME_SALE_SELECT = {
  id: true,
  title: true,
  type: true,
  address: true,
  city: true,
  state: true,
  zip: true,
  dates: true,
  hours: true,
  verified: true,
  photos: true,
  liveNow: true,
  featured: true,
  featuredExpiresAt: true,
  impactKg: true,
  sellerUser: { select: { verifiedSeller: true } },
  items: { select: { id: true, name: true }, orderBy: { id: "asc" } },
} as const;

type HomeSale = {
  id: string;
  title: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dates: string;
  hours: string;
  verified: boolean;
  photos: string[];
  liveNow: boolean;
  featured: boolean;
  featuredExpiresAt: string | null;
  impactKg: number;
  sellerVerifiedSeller: boolean;
  items: { id: string; name: string }[];
};

function parsePhotos(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeHomeSale(row: {
  id: string;
  title: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dates: string;
  hours: string;
  verified: boolean;
  photos: string | string[];
  liveNow: boolean;
  featured: boolean;
  featuredExpiresAt: Date | null;
  impactKg: number;
  sellerUser: { verifiedSeller: boolean } | null;
  items: { id: string; name: string }[];
}): HomeSale {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    dates: row.dates,
    hours: row.hours,
    verified: row.verified,
    photos: parsePhotos(row.photos),
    liveNow: row.liveNow,
    featured: row.featured,
    featuredExpiresAt: row.featuredExpiresAt
      ? row.featuredExpiresAt.toISOString()
      : null,
    impactKg: row.impactKg,
    sellerVerifiedSeller: row.sellerUser?.verifiedSeller ?? false,
    items: row.items,
  };
}

async function loadHomeData(): Promise<{
  featuredSales: HomeSale[];
  activeSales: number;
  totalItems: number;
  totalImpact: number;
}> {
  const where = { hidden: { not: true } } as const;

  // Fire featured sales, aggregates, and item count in parallel.
  const [sales, aggregate, totalItems] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: HOME_SALE_SELECT,
    }),
    prisma.sale.aggregate({
      where,
      _count: { _all: true },
      _sum: { impactKg: true },
    }),
    prisma.item.count({
      where: { sale: { is: { hidden: { not: true } } } },
    }),
  ]);

  return {
    featuredSales: sales.map(normalizeHomeSale),
    activeSales: aggregate._count._all,
    totalItems,
    totalImpact: aggregate._sum.impactKg ?? 0,
  };
}

function HomeDataFallback() {
  // Renders skeleton placeholders in the three sections that consume the
  // data: the dark stats strip (after hero), the impact callout, and the
  // "Sales happening now" grid. Pure CSS, no client JS.
  return (
    <>
      <section className="relative z-10 -mt-10 mx-4 sm:mx-6 lg:mx-auto lg:max-w-6xl">
        <div className="rounded-2xl bg-surface-900 px-6 py-8 shadow-2xl ring-1 ring-surface-900/10 sm:px-10 lg:px-14">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-9 w-20 rounded bg-white/10" />
                <div className="mt-3 h-3 w-24 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-xl border border-surface-200 bg-white"
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

async function HomeDataSections() {
  const { featuredSales, activeSales, totalItems, totalImpact } =
    await loadHomeData();
  return (
    <>
      {/* STATS STRIP — uses activeSales/totalItems/totalImpact */}
      <section className="relative z-10 -mt-10 mx-4 sm:mx-6 lg:mx-auto lg:max-w-6xl">
        <div className="rounded-2xl bg-surface-900 px-6 py-8 shadow-2xl ring-1 ring-surface-900/10 sm:px-10 lg:px-14">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <StatCounter value={activeSales} label="sales this weekend" />
            <StatCounter value={totalItems} label="items listed" />
            <StatCounter
              value={totalImpact}
              decimals={1}
              suffix=" kg"
              label="waste diverted"
            />
            <StatCounter value={97} suffix="%" label="say it saves gas" />
          </div>
        </div>
      </section>

      {/* FEATURED SALES GRID — uses featuredSales */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="eyebrow">This weekend</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-surface-900">
                Sales happening now
              </h2>
            </div>
            <Link
              href="/sales"
              className="hidden text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline sm:inline-flex items-center gap-1"
            >
              View all sales
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredSales.map((sale) => (
              <SaleCard key={sale.id} sale={sale as unknown as Sale} />
            ))}
          </div>

          {featuredSales.length === 0 && (
            <p className="mt-4 text-surface-500">
              No featured sales available yet — check back soon.
            </p>
          )}
        </div>
      </section>

      {/* IMPACT CALLOUT — uses totalImpact, totalItems */}
      <section className="bg-surface-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 rounded-2xl border border-success-200 bg-success-50 p-8 sm:p-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-700">
                <Leaf className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
                A Saturday drive that pays you back.
              </h2>
              <p className="mt-2 max-w-2xl text-surface-700">
                Every item sold through GarageRoute keeps reusable goods out of
                the landfill. Track your household&apos;s diverted-waste total
                in your dashboard.
              </p>
            </div>
            <div className="flex items-center justify-start gap-8 lg:justify-end">
              <div>
                <div className="text-4xl font-extrabold text-success-700">
                  {Math.round(totalImpact).toLocaleString()}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-surface-600">
                  kg diverted
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-success-700">
                  {totalItems.toLocaleString()}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-surface-600">
                  items rehomed
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Per-page metadata. Without this the layout title template wins, but the
// render was leaking an admin-internal label into the customer SERP —
// pinning it here guarantees the public-facing headline wins.
export const metadata: Metadata = {
  title: "GarageRoute — Find garage sales. Plan the route.",
  description:
    "Discover local garage and estate sales, preview items, and build optimized weekend routes.",
  alternates: {
    canonical: "https://garageroute.com",
  },
  openGraph: {
    title: "GarageRoute — Find garage sales. Plan the route.",
    description:
      "Preview items inside local garage sales and build an optimized Saturday route.",
    type: "website",
    url: "https://garageroute.com",
    siteName: "GarageRoute",
  },
  twitter: {
    card: "summary_large_image",
    title: "GarageRoute — Find garage sales. Plan the route.",
    description:
      "Preview items inside local garage sales and build an optimized Saturday route.",
  },
};

const features = [
  {
    icon: Search,
    title: "Search inside sales",
    desc: "Find exact items — vinyl, drills, kids' clothes — before you start the car.",
  },
  {
    icon: MapIcon,
    title: "Smart route planner",
    desc: "Add favorites and optimize your Saturday drive so you shop more, drive less.",
  },
  {
    icon: BadgeCheck,
    title: "Verified sellers",
    desc: "Trust badges, photos, and reviews so you know the sale is worth the trip.",
  },
  {
    icon: Clock,
    title: "Real-time updates",
    desc: "Sellers mark items sold, share wait times, and post last-minute deals.",
  },
  {
    icon: Zap,
    title: "Instant alerts",
    desc: "Get notified when new sales match your ZIP, category, and wishlist.",
  },
  {
    icon: Recycle,
    title: "Waste diverted",
    desc: "Every item resold is one less thing in a landfill. Track your impact.",
  },
];

const steps = [
  { n: "1", title: "Search",   desc: "Type an item, category, or neighborhood." },
  { n: "2", title: "Preview",  desc: "See photos, prices, and condition before you go." },
  { n: "3", title: "Route",    desc: "Add sales and let us optimize your drive." },
  { n: "4", title: "Score",    desc: "Show up early, informed, and grab the deals first." },
];

const testimonials = [
  {
    name: "Marcus T.",
    role: "Moving sale host",
    text: "We sold 80% of our stuff in one morning. The route brought serious buyers.",
  },
  {
    name: "Sarah & Dave",
    role: "Weekend hunters",
    text: "Found a $180 teak credenza for $40 because we saw it listed the night before.",
  },
  {
    name: "Retro Rick",
    role: "Collectibles seller",
    text: "Buyers show up knowing exactly what I have. No more early-bird chaos.",
  },
];

const partnerLogos = ["Northside", "Maple St.", "Lakeshore", "Birchwood", "Heritage", "Foxglove"];

export default async function Home() {
  const reqHeaders = await headers();
  const stateSlug = reqHeaders.get("x-state-slug");
  const stateName = reqHeaders.get("x-state-name");

  // --- State subdomain: live → scoped landing ---
  if (stateSlug && stateName) {
    const state = await prisma.state.findUnique({
      where: { slug: stateSlug.toLowerCase() },
    });

    if (state) {
      const isLive = state.status === "live";

      if (isLive) {
        const targetCities: string[] = JSON.parse(state.targetCities || "[]");
        const stateSales = await fetchSales().catch(() => []).then((all) =>
          all.filter((s) => s.state.toLowerCase() === stateName.toLowerCase()).slice(0, 3)
        );
        return (
          <div className="flex flex-col">
            <StateHero
              state={{
                name: state.name,
                abbreviation: state.abbreviation,
                tagline: state.tagline || `Find garage sales in ${state.name}`,
                saleCount: stateSales.length,
                targetCities,
              }}
            />
            {/* State-scoped "Top sales" grid */}
            <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-surface-900">
                  Top sales in {state.name}
                </h2>
                <p className="mt-1 text-surface-600">
                  Weekend garage, estate, and yard sales near you.
                </p>
              </div>
              {stateSales.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {stateSales.map((sale) => (
                    <SaleCard key={sale.id} sale={sale} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-surface-200 bg-white p-8 text-center">
                  <p className="font-medium text-surface-700">No sales posted yet in {state.name}.</p>
                  <Link href="/post" className="btn btn-primary mt-4 inline-flex">
                    Be the first to post
                  </Link>
                </div>
              )}
              <div className="mt-8 text-center">
                <Link href="/sales" className="btn btn-secondary">
                  Browse all {state.name} sales
                </Link>
              </div>
            </section>
            <section className="bg-surface-50 py-16">
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <AlertSignup stateContext={stateName} />
              </div>
            </section>
          </div>
        );
      }

      // Non-live subdomain → coming-soon page content
      const targetCities: string[] = JSON.parse(state.targetCities || "[]");
      const estimatedMonth = (() => {
        if (state.launchDate) {
          return new Date(state.launchDate).toLocaleString("en-US", {
            month: "long",
            year: "numeric",
          });
        }
        const now = new Date();
        now.setMonth(now.getMonth() + Math.max(1, state.sortOrder));
        return now.toLocaleString("en-US", { month: "long", year: "numeric" });
      })();

      return (
        <div className="flex flex-col">
          <StateHero
            state={{
              name: state.name,
              abbreviation: state.abbreviation,
              tagline: state.tagline || `GarageRoute is coming to ${state.name}`,
              saleCount: 0,
              targetCities,
            }}
          />
          <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="card p-8">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-brand-600" aria-hidden="true" />
                <span className="text-sm font-medium text-brand-700">
                  {state.status === "seeding" ? "Seeding" : "Coming soon"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-surface-900">
                {state.name} is on the map.
              </h2>
              <p className="mt-3 text-surface-600 leading-relaxed">
                We&apos;re building the garage sale network in{" "}
                <strong className="font-semibold text-surface-900">{state.name}</strong>. Our
                team is scouting neighborhoods, partnering with local communities, and
                preparing to launch — with verified sellers, item search, and route
                planning from day one.
              </p>
              {targetCities.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-surface-700 mb-2">
                    First target cities:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {targetCities.map((city) => (
                      <span key={city} className="badge badge-brand">
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 flex items-center gap-2 text-sm text-surface-600">
                <span className="font-medium">Expected launch:</span>
                <span className="font-semibold text-surface-900">{estimatedMonth}</span>
              </div>
              <div className="mt-8 border-t border-surface-200 pt-8">
                <p className="text-sm text-surface-600 mb-4">
                  Be the first to know when {state.name} goes live:
                </p>
                <div className="max-w-sm">
                  <StateSignupForm stateSlug={state.slug} stateName={state.name} />
                </div>
              </div>
            </div>
          </section>
        </div>
      );
    }
  }

  // --- Bare domain → national landing + StatePicker ---
  // The featured grid + stats are loaded inside <Suspense> below so the hero
  // streams immediately. We still need the state list to render the picker.
  const allStates = await prisma.state.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, status: true },
  });

  return (
    <div className="flex flex-col">
      <Script
        id="org-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <Script
        id="website-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden bg-surface-0">
        {/* Subtle ambient gradients */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-brand-100/40 blur-3xl" />
          <div className="absolute top-1/3 -right-32 h-[26rem] w-[26rem] rounded-full bg-brand-50/60 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent_80%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Plan your Saturday in 60 seconds
              </div>

              <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-surface-900 sm:text-6xl lg:text-[4.25rem]">
                Find treasures.{" "}
                <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-info-600 bg-clip-text text-transparent">
                  Plan the route.
                </span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-surface-600 sm:text-xl">
                Preview items inside garage and estate sales, build your optimized
                Saturday driving route, and beat the crowds to the best deals.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/sales" className="btn btn-primary cursor-pointer px-7 py-3.5 text-base">
                  Browse sales near you
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link href="/post" className="btn btn-secondary cursor-pointer px-7 py-3.5 text-base">
                  Post your sale free
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-4 text-sm text-surface-600">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      aria-hidden="true"
                      className="h-9 w-9 rounded-full border-2 border-surface-0 bg-gradient-to-br from-brand-400 to-brand-600"
                    />
                  ))}
                </div>
                <p>
                  <strong className="font-semibold text-surface-900">12,000+</strong>{" "}
                  bargain hunters joined this month
                </p>
              </div>
            </div>

            <div className="relative">
              {/* Floating dark glass search card */}
              <div className="relative rounded-2xl bg-surface-900 p-1 shadow-2xl shadow-brand-900/20 ring-1 ring-surface-900/10">
                <HeroSearch />
              </div>
              {/* Decorative accent */}
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-6 hidden h-32 w-32 rounded-full bg-brand-500/10 blur-2xl lg:block" />
            </div>
          </div>
        </div>
      </section>

      {/* Data-dependent sections (stats + featured + impact) stream in via
          Suspense so the hero renders immediately. */}
      <Suspense fallback={<HomeDataFallback />}>
        <HomeDataSections />
      </Suspense>

      {/* ============= TRUST LOGOS + STATE PICKER ============= */}
      <section className="bg-surface-0 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-surface-500 font-semibold">
                Live now in
              </p>
              <StatePicker states={allStates} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
              {partnerLogos.map((name) => (
                <span
                  key={name}
                  className="text-lg font-semibold tracking-tight text-surface-400 select-none"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============= FEATURES ============= */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              Everything but the gas money.
            </h2>
            <p className="mt-4 text-surface-600">
              We built the tool we wished existed every Saturday morning.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="card card-hover p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <f.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-surface-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============= HOW IT WORKS ============= */}
      <section className="border-y border-surface-200 bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              From your couch to the curb.
            </h2>
            <p className="mt-4 text-surface-600">
              Four simple steps and you&apos;re in the driver&apos;s seat.
            </p>
          </div>

          <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
              <div key={step.n} className="relative text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-lg shadow-brand-600/20">
                  {step.n}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute left-1/2 top-7 hidden h-0.5 w-full bg-gradient-to-r from-brand-200 to-transparent lg:block"
                  />
                )}
                <h3 className="mt-5 text-lg font-bold text-surface-900">{step.title}</h3>
                <p className="mt-2 text-sm text-surface-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= TESTIMONIALS ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Loved on both sides of the table</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
              Buyers and sellers, week after week.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="card p-6 flex flex-col gap-4">
                <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-warning-500 text-warning-500" />
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed text-surface-800 flex-1">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3 border-t border-surface-200 pt-4">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white"
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900 text-sm">{t.name}</p>
                    <p className="text-xs text-surface-500">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============= SELLER CTA ============= */}
      <section className="bg-surface-0 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-surface-900 px-6 py-16 text-center text-surface-50 sm:px-12 lg:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.22),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_45%)]"
            />

            <div className="relative mx-auto max-w-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30">
                <Package className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl text-white">
                Turn your clutter into cash this Saturday.
              </h2>
              <p className="mt-4 text-surface-300">
                Post your garage sale for free, add photos and item listings, and get
                discovered by buyers already planning their route.
              </p>

              <ul className="mt-6 inline-flex flex-col items-start gap-2 text-left text-sm text-surface-300">
                {[
                  "Free listing with up to 50 items",
                  "Reach buyers searching by category",
                  "Virtual queue and message inbox built in",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/post" className="btn btn-primary cursor-pointer px-7 py-3.5 text-base">
                  <Wallet2 className="h-4 w-4" aria-hidden="true" />
                  Post your sale for free
                </Link>
                <span className="text-sm text-surface-400">
                  No card. Live in 60 seconds.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= ALERTS / REGISTRATION ============= */}
      <section className="bg-surface-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-surface-900">
              Never miss a deal.
            </h2>
            <p className="mt-2 text-surface-600">
              Get free alerts when new sales match your interests and ZIP code.
            </p>
          </div>
          <div className="mt-8">
            <AlertSignup />
          </div>
        </div>
      </section>
    </div>
  );
}
