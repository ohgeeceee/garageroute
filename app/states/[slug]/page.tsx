import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StateHero from "@/components/StateHero";
import StateSignupForm from "@/components/StateSignupForm";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const states = await prisma.state.findMany({
    select: { slug: true },
  });
  return states.map((s) => ({ slug: s.slug }));
}

async function getState(slug: string) {
  return prisma.state.findUnique({ where: { slug } });
}

export default async function StateSlugPage({ params }: Props) {
  const { slug } = await params;
  const state = await getState(slug);

  if (!state) notFound();

  const isLive = state.status === "live";
  const isComingSoon = state.status === "preview" || state.status === "seeding";

  const launchMonth = state.launchDate
    ? new Date(state.launchDate).toLocaleString("en-US", { month: "long", year: "numeric" })
    : null;

  // Estimate launch month from sortOrder if not set
  const estimatedMonth = launchMonth
    ? launchMonth
    : (() => {
        const now = new Date();
        now.setMonth(now.getMonth() + Math.max(1, state.sortOrder));
        return now.toLocaleString("en-US", { month: "long", year: "numeric" });
      })();

  const targetCities: string[] = JSON.parse(state.targetCities || "[]");

  if (isLive) {
    // Redirect to the subdomain
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-2xl font-bold text-surface-900">{state.name} is live!</h1>
        <p className="mt-2 text-surface-600">
          Visit{" "}
          <a
            href={`https://${state.slug}.garageroute.com`}
            className="text-brand-600 hover:underline font-medium"
          >
            {state.slug}.garageroute.com
          </a>{" "}
          to browse sales.
        </p>
        <a
          href={`https://${state.slug}.garageroute.com/sales`}
          className="btn btn-primary mt-6"
        >
          Browse {state.name} sales
        </a>
      </div>
    );
  }

  if (!isComingSoon) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <StateHero
        state={{
          name: state.name,
          abbreviation: state.abbreviation,
          tagline: state.tagline || `GarageRoute is coming to ${state.name}`,
          saleCount: 0,
          targetCities,
        }}
      />

      {/* Coming soon body */}
      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <Link
          href="/states"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-8"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to all states
        </Link>

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
