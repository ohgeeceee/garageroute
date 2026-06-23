import { prisma } from "@/lib/prisma";
import StateCard from "@/components/StateCard";
import StateSignupForm from "@/components/StateSignupForm";
import { Map } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStates() {
  return prisma.state.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export default async function StatesPage() {
  const states = await getStates();

  const live = states.filter((s) => s.status === "live");
  const comingSoon = states.filter((s) => s.status !== "live");

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="bg-surface-0 border-b border-surface-200 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-surface-500 mb-3">
            <Map className="h-4 w-4" aria-hidden="true" />
            State network
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 sm:text-4xl">
            GarageRoute is going nationwide.
          </h1>
          <p className="mt-3 max-w-xl text-base text-surface-600">
            We&apos;re building the neighborhood-scale garage sale network, one state at a
            time. Live now in select states — preview rolling out across the country.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Live states */}
        {live.length > 0 && (
          <section className="mb-14">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-xl font-bold text-surface-900">Live now</h2>
              <span className="badge badge-success text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-success-600 inline-block" />
                {live.length} state{live.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((state) => (
                <StateCard
                  key={state.id}
                  slug={state.slug}
                  name={state.name}
                  abbreviation={state.abbreviation}
                  tagline={state.tagline || ""}
                  saleCount={0}
                  sellerCount={0}
                  status={state.status}
                />
              ))}
            </div>
          </section>
        )}

        {/* Coming soon */}
        {comingSoon.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-xl font-bold text-surface-900">Coming soon</h2>
              <span className="badge badge-neutral text-xs">
                {comingSoon.length} state{comingSoon.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {comingSoon.map((state) => {
                const launchMonth = state.launchDate
                  ? new Date(state.launchDate).toLocaleString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : null;
                return (
                  <article
                    key={state.id}
                    id={state.slug}
                    className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-surface-900">
                            {state.name}
                          </h3>
                          <span className="text-xs text-surface-500">
                            {state.abbreviation}
                          </span>
                        </div>
                        <span className="badge badge-neutral shrink-0">
                          {state.status === "seeding" ? "Seeding" : "Coming soon"}
                        </span>
                      </div>

                      {state.tagline && (
                        <p className="text-sm text-surface-600">{state.tagline}</p>
                      )}

                      {launchMonth && (
                        <p className="text-xs text-surface-500">
                          Expected launch: <span className="font-medium text-surface-700">{launchMonth}</span>
                        </p>
                      )}

                      {state.targetCities && (
                        <p className="text-xs text-surface-500">
                          Target cities:{" "}
                          <span className="font-medium text-surface-700">
                            {(() => {
                              const cities: string[] = JSON.parse(state.targetCities || "[]");
                              return cities.slice(0, 3).join(", ") || "TBD";
                            })()}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 sm:w-52">
                      <StateSignupForm stateSlug={state.slug} stateName={state.name} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {states.length === 0 && (
          <div className="text-center py-16 text-surface-500">
            <p>No states in the network yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
