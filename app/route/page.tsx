"use client";

import Link from "next/link";
import { MapPin, Calendar, Trash2, Navigation, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoute } from "@/context/RouteContext";
import DynamicMap from "@/components/DynamicMap";
import { Sale } from "@/data/sales";
import { fetchRouteDirections } from "@/lib/routeDirections";

function haversine(a: Sale, b: Sale) {
  const R = 3958.8; // miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

type RoutingState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; distanceMiles: number; durationMinutes: number; legs: { distanceMiles: number; durationMinutes: number }[] }
  | { kind: "error"; message: string };

export default function RoutePage() {
  const { itinerary, removeSale, clearItinerary, reorderItinerary } = useRoute();
  const [routeGeometry, setRouteGeometry] =
    useState<[number, number][] | undefined>(undefined);
  const [routing, setRouting] = useState<RoutingState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    setRouteGeometry(undefined);

    if (itinerary.length < 2) {
      setRouting({ kind: "idle" });
      return;
    }

    setRouting({ kind: "loading" });
    fetchRouteDirections(itinerary.map((s) => ({ lat: s.lat, lng: s.lng })))
      .then((directions) => {
        if (cancelled) return;
        if (!directions) {
          setRouting({
            kind: "error",
            message: "Driving directions unavailable. Showing stops only — distance & time use straight-line estimate.",
          });
          return;
        }
        setRouteGeometry(directions.geometry);
        setRouting({
          kind: "ok",
          distanceMiles: directions.distanceMiles,
          durationMinutes: directions.durationMinutes,
          legs: directions.legs,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setRouting({
          kind: "error",
          message: `Routing failed: ${err?.message ?? "unknown error"}`,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [itinerary]);

  const optimizeRoute = () => {
    if (itinerary.length < 3) return;
    const start = itinerary[0];
    const rest = [...itinerary.slice(1)];
    const ordered: Sale[] = [start];
    let current = start;

    while (rest.length) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      rest.forEach((sale, idx) => {
        const dist = haversine(current, sale);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });
      const [next] = rest.splice(nearestIdx, 1);
      ordered.push(next);
      current = next;
    }

    reorderItinerary(ordered);
  };

  const totalDistance = itinerary.reduce((sum, sale, idx) => {
    if (idx === 0) return 0;
    return sum + haversine(itinerary[idx - 1], sale);
  }, 0);

  if (itinerary.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-8">
          <Navigation className="mx-auto h-10 w-10 text-zinc-300" />
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">
            Your route is empty
          </h1>
          <p className="mt-2 text-zinc-600">
            Browse sales and add the ones you want to visit. We&apos;ll map the best
            order to hit them all.
          </p>
          <Link
            href="/sales"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700"
          >
            Browse sales
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Saturday Route</h1>
          <RouteSummary routing={routing} itineraryCount={itinerary.length} totalDistance={totalDistance} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={optimizeRoute}
            disabled={itinerary.length < 3}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Navigation className="h-4 w-4" />
            Optimize route
          </button>
          <button
            onClick={clearItinerary}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {routing.kind === "error" && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{routing.message}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,460px]">
        <div className="space-y-3">
          {itinerary.map((sale, idx) => (
            <RouteStopCard
              key={sale.id}
              sale={sale}
              index={idx}
              total={itinerary.length}
              leg={routing.kind === "ok" ? routing.legs[idx - 1] : undefined}
              onRemove={() => removeSale(sale.id)}
            />
          ))}
        </div>
        <div className="relative h-[500px] lg:h-auto lg:sticky lg:top-20">
          <DynamicMap
            sales={itinerary}
            routeMode
            routeGeometry={routeGeometry}
            className="h-full min-h-[420px]"
          />
          {routing.kind === "loading" && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] mx-auto w-fit rounded-full border border-blue-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-md backdrop-blur">
              <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin align-text-bottom" />
              Calculating driving directions…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteSummary({
  routing,
  itineraryCount,
  totalDistance,
}: {
  routing: RoutingState;
  itineraryCount: number;
  totalDistance: number;
}) {
  if (routing.kind === "loading") {
    return (
      <p className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {itineraryCount} stop{itineraryCount !== 1 ? "s" : ""} · calculating route…
      </p>
    );
  }
  if (routing.kind === "ok") {
    return (
      <p className="mt-1 text-sm text-zinc-600">
        {itineraryCount} stop{itineraryCount !== 1 ? "s" : ""}{" "}
        · <span className="font-semibold text-zinc-900">{routing.distanceMiles.toFixed(1)} mi driving</span>{" "}
        · <span className="font-semibold text-zinc-900">{Math.round(routing.durationMinutes)} min</span>
      </p>
    );
  }
  if (routing.kind === "error") {
    return (
      <p className="mt-1 text-sm text-zinc-600">
        {itineraryCount} stop{itineraryCount !== 1 ? "s" : ""} ·{" "}
        <span className="font-semibold text-zinc-900">~{totalDistance.toFixed(1)} mi</span> straight-line estimate
      </p>
    );
  }
  return (
    <p className="mt-1 text-sm text-zinc-600">
      {itineraryCount} stop{itineraryCount !== 1 ? "s" : ""} · ~{totalDistance.toFixed(1)} miles between stops
    </p>
  );
}

function RouteStopCard({
  sale,
  index,
  total,
  leg,
  onRemove,
}: {
  sale: Sale;
  index: number;
  total: number;
  leg?: { distanceMiles: number; durationMinutes: number };
  onRemove: () => void;
}) {
  const variant: "start" | "stop" | "end" =
    index === 0 ? "start" : index === total - 1 ? "end" : "stop";
  const variantStyle = {
    start: "bg-emerald-100 text-emerald-700 border-emerald-200",
    stop:  "bg-blue-100 text-blue-700 border-blue-200",
    end:   "bg-red-100 text-red-700 border-red-200",
  }[variant];
  return (
    <div className="relative">
      {index > 0 && leg && (
        <div className="mb-1 flex items-center gap-2 pl-9 text-xs text-zinc-500">
          <span className="inline-block h-px w-4 bg-zinc-300" />
          <span>{leg.distanceMiles.toFixed(1)} mi · {Math.round(leg.durationMinutes)} min</span>
        </div>
      )}
      <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <span
          aria-label={variant === "start" ? "First stop" : variant === "end" ? "Last stop" : `Stop ${index + 1}`}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${variantStyle}`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900">{sale.title}</p>
          <p className="flex items-center gap-1 text-sm text-zinc-500">
            <Calendar className="h-3.5 w-3.5" />
            {sale.dates} · {sale.hours}
          </p>
          <p className="flex items-center gap-1 text-sm text-zinc-500">
            <MapPin className="h-3.5 w-3.5" />
            {sale.address}, {sale.city}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
          aria-label="Remove from route"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
