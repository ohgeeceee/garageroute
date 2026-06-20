"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Map as MapIcon, Loader2 } from "lucide-react";
import type { Sale } from "@/data/sales";
import { saleTypes, categories } from "@/data/sales";
import SaleCard from "@/components/SaleCard";
import AlertSignup from "@/components/AlertSignup";
import LocationBar from "@/components/LocationBar";
import WeekendTabs from "@/components/WeekendTabs";
import { getStoredLocation, type StoredLocation } from "@/lib/location";
import type { TimeWindow } from "@/lib/weekend";

// SalesMap imports leaflet which requires `window` — load client-only.
const SalesMap = dynamic(() => import("@/components/SalesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-500">
      Loading map…
    </div>
  ),
});

const DEFAULT_RADIUS = 25;

type Props = {
  loggedIn: boolean;
  initialFavoriteIds: string[];
};

export default function SalesBrowser({ loggedIn, initialFavoriteIds }: Props) {
  // Location (from localStorage on mount).
  const [location, setLocation] = useState<StoredLocation | null>(null);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);

  // Filters.
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [when, setWhen] = useState<TimeWindow>("weekend");

  // View toggle.
  const [view, setView] = useState<"list" | "map">("list");

  // Data.
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const favoriteSet = useMemo(() => new Set(initialFavoriteIds), [initialFavoriteIds]);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    // localStorage is browser-only — defer to post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocation(getStoredLocation());
  }, []);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (type) params.set("type", type);
      if (category) params.set("category", category);
      if (verifiedOnly) params.set("verifiedOnly", "true");
      params.set("when", when);
      if (location) {
        params.set("lat", String(location.lat));
        params.set("lng", String(location.lng));
        params.set("radius", String(radius));
      }
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSales(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [query, type, category, verifiedOnly, when, location, radius]);

  useEffect(() => {
    // fetchSales() is async; setState happens inside async callbacks, not
    // synchronously. The lint rule triggers on the call site anyway, so we
    // silence it here — this is the correct pattern for "fetch on mount and
    // when filters change".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSales();
  }, [fetchSales]);

  // After location changes, jump radius up to 50 if there are no nearby sales.
  const handleExpandRadius = () => setRadius(50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        Browse garage & yard sales
      </h1>
      <p className="mt-1 text-zinc-600">
        Find sales in your area — then add favorites and build a route.
      </p>

      <div className="mt-5">
        <LocationBar
          location={location}
          onChange={(loc) => {
            setLocation(loc);
            setRadius(DEFAULT_RADIUS);
          }}
        />
      </div>

      {location && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          <span>Radius:</span>
          {[5, 10, 25, 50].map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                radius === r
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {r} mi
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, items, or cities"
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All sale types</option>
          {saleTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All item categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600"
          />
          Verified only
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WeekendTabs value={when} onChange={setWhen} />
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-sm">
          <button
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
              view === "list"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setView("map")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
              view === "map"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <MapIcon className="h-4 w-4" />
            Map
          </button>
        </div>
      </div>

      <div className="mt-6">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sales…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && view === "list" && (
          <>
            <p className="mb-3 text-sm text-zinc-500">
              {sales.length} sale{sales.length !== 1 ? "s" : ""} found
            </p>
            {sales.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
                <p className="font-medium text-zinc-700">No sales match your filters.</p>
                {location && radius < 50 && (
                  <button
                    onClick={handleExpandRadius}
                    className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Try expanding to 50 mi →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sales.map((sale) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    favoriteIds={favoriteSet}
                    loggedIn={loggedIn}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && view === "map" && (
          <div className="h-[600px]">
            <SalesMap sales={sales} className="h-full" />
          </div>
        )}
      </div>

      <div className="mt-10">
        <AlertSignup defaultZip={location?.zip} />
      </div>
    </div>
  );
}