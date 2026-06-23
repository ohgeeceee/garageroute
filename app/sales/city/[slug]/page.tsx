import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import {
  MapPin,
  Calendar,
  Package,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Home,
  Tag,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseCitySlug, buildCitySlug } from "@/lib/city-slug";
import { saleListJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";
import SaleCard from "@/components/SaleCard";

type Props = {
  params: Promise<{ slug: string }>;
};

// Pre-build every (city, state) combination that exists in the DB at build time.
// Sales can be added later and Next.js will render them on-demand via ISR.
export async function generateStaticParams() {
  const sales = await prisma.sale.findMany({
    select: { city: true, state: true },
    distinct: ["city", "state"],
  });
  return sales.map((s) => ({ slug: buildCitySlug(s.city, s.state) }));
}

export const dynamicParams = true;
export const revalidate = 3600; // refresh hourly

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseCitySlug(slug);
  if (!parsed) return { robots: { index: false, follow: true } };

  const { city, state } = parsed;

  // SQLite-portable city count. We can't use Prisma's `mode: "insensitive"`
  // on SQLite, so pull all state sales and filter in JS. Cheap at current
  // scale; switch to a normalized city column once state sales > 500.
  const stateSales = await prisma.sale.findMany({
    where: { state },
    select: { city: true },
  });
  const count = stateSales.filter(
    (s) => s.city.toLowerCase() === city.toLowerCase()
  ).length;
  if (count === 0) return { robots: { index: false, follow: true } };

  const title = `Garage Sales in ${city}, ${state} — ${count} active`;
  const description = `Browse ${count} garage sales, estate sales, and yard sales in ${city}, ${state}. Preview items, plan your Saturday route, and beat the crowds.`;
  const canonical = `https://garageroute.com/sales/city/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: "GarageRoute",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CitySalesPage({ params }: Props) {
  const { slug } = await params;
  const parsed = parseCitySlug(slug);
  if (!parsed) notFound();

  const { city, state } = parsed;

  const allStateSales = await prisma.sale.findMany({
    where: { state },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  // Prisma's `mode: "insensitive"` is not portable to SQLite (the prod
  // driver for this project). Filter city case-insensitively in JS — fine
  // at our current scale; switch to a normalized city column when city
  // counts per state exceed ~500.
  const sales = allStateSales.filter(
    (s) => s.city.toLowerCase() === city.toLowerCase()
  );

  if (sales.length === 0) notFound();

  // Compute local stats for unique content per page.
  const totalItems = sales.reduce((sum, s) => sum + s.items.length, 0);
  const verifiedCount = sales.filter((s) => s.verified).length;
  const categories = new Map<string, number>();
  for (const s of sales) {
    for (const item of s.items) {
      categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
    }
  }
  const topCategories = [...categories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, n]) => ({ name, count: n }));

  // Group by ZIP prefix to surface neighborhoods.
  const neighborhoods = new Map<string, number>();
  for (const s of sales) {
    const zip = (s.zip || "").slice(0, 3); // first 3 digits = ZIP-3 area
    if (zip) neighborhoods.set(zip, (neighborhoods.get(zip) ?? 0) + 1);
  }
  const topNeighborhoods = [...neighborhoods.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([zip, n]) => ({ zip, count: n }));

  // Headline phrases — vary by data so each page reads naturally.
  const marketDescriptor =
    sales.length >= 20
      ? "a busy"
      : sales.length >= 8
      ? "an active"
      : sales.length >= 3
      ? "a growing"
      : "an emerging";
  const nextSale = sales[0];

  return (
    <div className="bg-surface-50">
      {/* JSON-LD */}
      <Script
        id={`city-breadcrumb-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: "https://garageroute.com" },
              {
                name: "Browse sales",
                url: "https://garageroute.com/sales",
              },
              {
                name: `${city}, ${state}`,
                url: `https://garageroute.com/sales/city/${slug}`,
              },
            ])
          ),
        }}
      />
      <Script
        id={`city-list-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(saleListJsonLd(sales)),
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.30),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-surface-400">
            <Link href="/" className="inline-flex items-center gap-1 hover:text-surface-200">
              <Home className="h-3 w-3" /> Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/sales" className="hover:text-surface-200">
              Sales
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-surface-200">
              {city}, {state}
            </span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.5fr,1fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300">
                <MapPin className="h-3.5 w-3.5" /> {state}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Garage sales in{" "}
                <span className="bg-gradient-to-r from-brand-300 to-info-300 bg-clip-text text-transparent">
                  {city}, {state}
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-surface-300">
                {city}, {state} is {marketDescriptor} market on GarageRoute
                {sales.length === 1
                  ? `, with ${sales.length} sale currently listed.`
                  : `, with ${sales.length} sales across ${topNeighborhoods.length || 1} neighborhood${topNeighborhoods.length === 1 ? "" : "s"}.`}{" "}
                Browse listings below, preview items before you go, and plan an
                optimized Saturday route.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/sales?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`}
                  className="btn btn-primary"
                >
                  Filter the full list
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/post" className="btn btn-secondary !bg-white/10 !border-white/15 !text-white hover:!bg-white/15">
                  Post your {city} sale
                </Link>
              </div>
            </div>

            {/* Stats card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <dl className="grid grid-cols-2 gap-5 text-center">
                <Stat label="Active sales" value={sales.length} />
                <Stat label="Items listed" value={totalItems} />
                <Stat label="Verified sellers" value={verifiedCount} />
                <Stat
                  label="Categories"
                  value={categories.size}
                />
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* NEIGHBORHOODS + CATEGORIES */}
      {(topNeighborhoods.length > 0 || topCategories.length > 0) && (
        <section className="border-y border-surface-200 bg-surface-0">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2">
              {topNeighborhoods.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-surface-500">
                    <TrendingUp className="h-4 w-4" />
                    Neighborhoods with active sales
                  </h2>
                  <ul className="mt-4 grid grid-cols-2 gap-3">
                    {topNeighborhoods.map((n) => (
                      <li
                        key={n.zip}
                        className="flex items-center justify-between rounded-lg border border-surface-200 bg-surface-50 px-3 py-2"
                      >
                        <span className="font-mono text-sm text-surface-700">
                          {n.zip}xx
                        </span>
                        <span className="text-xs font-medium text-surface-500">
                          {n.count} sale{n.count === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {topCategories.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-surface-500">
                    <Tag className="h-4 w-4" />
                    What sellers are listing
                  </h2>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {topCategories.map((c) => (
                      <li
                        key={c.name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-sm"
                      >
                        <span className="font-medium text-surface-800">{c.name}</span>
                        <span className="text-xs text-surface-500">×{c.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ACTIVE SALES */}
      <section className="bg-surface-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
                Sales happening in {city}
              </h2>
              <p className="mt-1 text-surface-600">
                Updated continuously. Click a listing to preview items, check
                hours, and add it to your route.
              </p>
            </div>
            <Link
              href="/sales"
              className="hidden text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline sm:inline-flex items-center gap-1"
            >
              View all sales
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sales.slice(0, 24).map((sale) => (
              <SaleCard
                key={sale.id}
                sale={{
                  ...sale,
                  photos: typeof sale.photos === "string" ? JSON.parse(sale.photos || "[]") : sale.photos,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* LOCAL CONTEXT (unique copy per city) */}
      <section className="bg-surface-0 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
            About garage sales in {city}, {state}
          </h2>
          <div className="prose prose-surface mt-5 max-w-none text-surface-700">
            <p>
              GarageRoute is the operating system for local weekend commerce in{" "}
              {city}. Every {weekdayWord()} morning from spring through fall,
              {sales.length >= 3
                ? ` ${sales.length} sales`
                : " a handful of sales"}{" "}
              go live across the city, drawing hundreds of buyers looking for
              furniture, vintage clothing, tools, electronics, and one-of-a-kind
              finds.
            </p>
            <p>
              {nextSale && (
                <>
                  The next sale on GarageRoute is{" "}
                  <strong>{nextSale.title}</strong> on{" "}
                  <strong>{nextSale.dates}</strong>. Use the route planner to
                  combine multiple stops into one optimized loop — most
                  hunters hit 3–6 sales in a single Saturday morning.
                </>
              )}
            </p>
            <p>
              GarageRoute previews the inventory for every sale before you go,
              so you can skip the ones that don&apos;t have what you&apos;re
              hunting for and focus on the stops that do. Verified sellers carry
              a trust badge and are reviewed by our team before the badge is
              issued.
            </p>
            <h3 className="text-lg font-bold text-surface-900">
              Tips for {city} garage-sale hunters
            </h3>
            <ul>
              <li>
                Start early. The best items go fast, especially vintage and
                small electronics.
              </li>
              <li>
                Bring cash. Most sellers prefer it, and small bills make
                negotiation easier.
              </li>
              <li>
                Check the seller&apos;s photos the night before. GarageRoute
                sellers update inventory in real time, so the list you saw
                yesterday may have grown overnight.
              </li>
              <li>
                Use the route planner. Type in your starting ZIP and the tool
                will sequence your stops to minimize drive time.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SELLER CTA */}
      <section className="bg-surface-50 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
            Selling in {city} this weekend?
          </h2>
          <p className="mt-2 text-surface-600">
            Post your sale for free and reach buyers already planning their
            Saturday route through {city}.
          </p>
          <Link
            href="/post"
            className="btn btn-primary mt-6 inline-flex"
          >
            <Package className="h-4 w-4" />
            Post your {city} sale
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="font-display text-3xl font-extrabold text-white sm:text-4xl">
        {value.toLocaleString()}
      </dd>
      <dt className="mt-1 text-xs font-semibold uppercase tracking-wider text-surface-400">
        {label}
      </dt>
    </div>
  );
}

function weekdayWord(): string {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return "Saturday";
  return "weekend";
}