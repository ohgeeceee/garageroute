"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin, Plus, Navigation } from "lucide-react";
import { getThemeBySlug } from "@/data/themes";
import { Sale } from "@/data/sales";
import { useRoute } from "@/context/RouteContext";
import SaleCard from "@/components/SaleCard";
import DynamicMap from "@/components/DynamicMap";

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export default function ThemeRoutePage() {
  const params = useParams<{ slug: string }>();
  const theme = getThemeBySlug(params.slug);
  const { addSale, itinerary } = useRoute();

  const [sales, setSales] = useState<(Sale & { distance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number }>({
    lat: 39.7684,
    lng: -86.1581,
  });
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!theme) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setLocationError("Location access denied. Using city center.");
        }
      );
    }
  }, [theme]);

  useEffect(() => {
    if (!theme) return;
    const cats = theme.categories.join(",");
    fetch(`/api/sales?category=${encodeURIComponent(cats)}`)
      .then((res) => res.json())
      .then((data: Sale[]) => {
        const sorted = data
          .map((sale) => ({
            ...sale,
            distance: distanceKm(location, { lat: sale.lat, lng: sale.lng }),
          }))
          .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
        setSales(sorted);
      })
      .finally(() => setLoading(false));
  }, [theme, location]);

  if (!theme) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-900">Theme not found</h1>
        <Link href="/routes" className="mt-4 text-blue-600 hover:underline">
          Back to themes
        </Link>
      </div>
    );
  }

  const Icon = theme.icon;
  const addAll = () => sales.forEach((sale) => addSale(sale));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/routes"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to themes
      </Link>

      <div className="mt-4 flex items-start gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{theme.name} route</h1>
          <p className="text-zinc-600">{theme.description}</p>
        </div>
      </div>

      {locationError && (
        <p className="mt-3 text-sm text-amber-700">{locationError}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={addAll}
          disabled={sales.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add all to route
        </button>
        <Link
          href="/route"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          <Navigation className="h-4 w-4" />
          View route ({itinerary.length})
        </Link>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Building your route…
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,420px]">
          <div>
            <p className="mb-3 text-sm text-zinc-500">
              {sales.length} sales found, sorted by distance from you.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {sales.map((sale) => (
                <div key={sale.id}>
                  <SaleCard sale={sale} />
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin className="h-3 w-3" />
                    {sale.distance.toFixed(1)} km away
                  </p>
                </div>
              ))}
            </div>
            {sales.length === 0 && (
              <p className="mt-4 text-zinc-500">No matching sales right now.</p>
            )}
          </div>
          <div className="h-[500px] lg:h-auto">
            <DynamicMap sales={sales} className="h-full min-h-[400px]" />
          </div>
        </div>
      )}
    </div>
  );
}
