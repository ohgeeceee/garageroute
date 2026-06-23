import Link from "next/link";
import { ShoppingBag, Tag } from "lucide-react";

type Props = {
  state: {
    name: string;
    abbreviation: string;
    tagline: string;
    saleCount: number;
    targetCities: string[];
  };
};

export default function StateHero({ state }: Props) {
  const { name, abbreviation, tagline, saleCount, targetCities } = state;

  return (
    <section className="relative overflow-hidden bg-surface-900">
      {/* Hero placeholder: gradient + large state name in background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="select-none text-[12rem] font-extrabold leading-none tracking-tight text-white/5"
          aria-hidden="true"
        >
          {abbreviation}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-900/60 via-transparent to-surface-900"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(37,99,235,0.18),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.10),transparent_50%)]"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-1 text-xs font-semibold text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 inline-block" />
            {name}
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {tagline || `GarageRoute is coming to ${name}`}
          </h1>

          {saleCount > 0 && (
            <p className="mt-3 text-lg text-surface-300">
              <span className="font-semibold text-white">{saleCount.toLocaleString()}</span>{" "}
              sales posted this weekend
            </p>
          )}

          {targetCities.length > 0 && (
            <p className="mt-2 text-sm text-surface-400">
              Expanding to:{" "}
              <span className="font-medium text-surface-300">
                {targetCities.slice(0, 4).join(", ")}
                {targetCities.length > 4 ? ` +${targetCities.length - 4} more` : ""}
              </span>
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {saleCount > 0 ? (
              <>
                <a
                  href={`https://${name.toLowerCase()}.garageroute.com/sales`}
                  className="btn btn-primary px-6 py-3 text-sm"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  Browse {name} sales
                </a>
                <a
                  href={`https://${name.toLowerCase()}.garageroute.com/post`}
                  className="btn btn-secondary border-surface-600 text-surface-200 hover:border-surface-400 hover:bg-surface-800 px-6 py-3 text-sm"
                >
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  Post a {name} sale
                </a>
              </>
            ) : (
              <Link href="/states" className="btn btn-secondary border-surface-600 text-surface-200 hover:border-surface-400 hover:bg-surface-800 px-6 py-3 text-sm">
                Explore all states
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
