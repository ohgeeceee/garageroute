"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { Sale } from "@/data/sales";

// Default Leaflet marker icons break under bundlers; pin to CDN copies.
const ICON = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, points]);
  return null;
}

type Props = {
  sales: Sale[];
  className?: string;
  center?: [number, number];
  zoom?: number;
};

export default function SalesMap({ sales, className = "", center, zoom }: Props) {
  const valid = useMemo(
    () => sales.filter((s) => typeof s.lat === "number" && typeof s.lng === "number"),
    [sales]
  );
  const points = useMemo<[number, number][]>(
    () => valid.map((s) => [s.lat, s.lng]),
    [valid]
  );
  const initialCenter: [number, number] =
    center ?? (points[0] ? points[0] : [39.7684, -86.1581]);
  const initialZoom = zoom ?? (points.length > 1 ? 11 : 12);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 ${className}`}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: 400 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 0 && <FitBounds points={points} />}
        {valid.map((sale) => (
          <Marker key={sale.id} position={[sale.lat, sale.lng]} icon={ICON}>
            <Popup>
              <div className="space-y-1">
                <Link
                  href={`/sales/${sale.id}`}
                  className="block text-sm font-semibold text-zinc-900 hover:text-blue-700"
                >
                  {sale.title}
                </Link>
                <p className="text-xs text-zinc-600">{sale.address}, {sale.city}</p>
                <p className="text-xs text-zinc-500">{sale.dates} · {sale.hours}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}