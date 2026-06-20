"use client";

import { MapPin, Shield } from "lucide-react";
import { safeSpots } from "@/data/safeSpots";

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function SafeSpots({ lat, lng }: { lat: number; lng: number }) {
  const spots = safeSpots
    .map((spot) => ({
      ...spot,
      distance: distanceKm({ lat, lng }, { lat: spot.lat, lng: spot.lng }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-emerald-600" />
        <h2 className="font-semibold text-zinc-900">Safe meetup spots</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        Suggest one of these public, well-lit locations when messaging the seller.
      </p>
      <ul className="mt-4 space-y-3">
        {spots.map((spot) => (
          <li
            key={spot.name}
            className="flex items-start justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3"
          >
            <div>
              <p className="font-medium text-zinc-900">{spot.name}</p>
              <p className="text-sm text-zinc-500">
                {spot.address}, {spot.city}
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-zinc-600">
              <MapPin className="h-3 w-3" />
              {spot.distance.toFixed(1)} km
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
