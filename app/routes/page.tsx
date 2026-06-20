import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { themes } from "@/data/themes";

export default function RoutesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900">Curated themed routes</h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-600">
          Pick a theme and we’ll build a route of matching sales near you. Great
          for vintage hunters, parents, tool collectors, and more.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => {
          const Icon = theme.icon;
          return (
            <Link
              key={theme.slug}
              href={`/routes/${theme.slug}`}
              className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-zinc-900">
                {theme.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">{theme.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:underline">
                Build route
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl bg-zinc-100 p-8 text-center">
        <MapPin className="mx-auto h-8 w-8 text-zinc-400" />
        <p className="mt-2 text-zinc-600">
          We’ll ask for your location on the next screen so we can order sales
          from closest to farthest.
        </p>
      </div>
    </div>
  );
}
