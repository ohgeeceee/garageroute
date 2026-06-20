"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { Sale } from "@/data/sales";

/* ---------- Icons ---------- */

const basePinSvg = (fill: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" class="w-full h-full drop-shadow">
    <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 14.25a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clip-rule="evenodd"/>
  </svg>`;

const numberedPinSvg = (n: number, variant: "start" | "stop" | "end") => {
  const colors = {
    start: { bg: "#10B981", ring: "#FFFFFF" }, // emerald
    stop:  { bg: "#2563EB", ring: "#FFFFFF" }, // brand
    end:   { bg: "#DC2626", ring: "#FFFFFF" }, // red
  }[variant];
  return `
    <div style="position:relative;width:36px;height:46px;">
      <div style="
        position:absolute;top:0;left:0;
        width:36px;height:36px;border-radius:9999px;
        background:${colors.bg};
        border:3px solid ${colors.ring};
        box-shadow:0 4px 10px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
        font-family:'Inter',sans-serif;font-weight:700;color:white;font-size:14px;
        line-height:1;
      ">${n}</div>
      <div style="
        position:absolute;top:34px;left:14px;
        width:0;height:0;
        border-left:4px solid transparent;
        border-right:4px solid transparent;
        border-top:8px solid ${colors.bg};
        filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));
      "></div>
    </div>`;
};

const pinIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;">${basePinSvg("#2563eb")}</div>`,
  className: "bg-transparent",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const numberedIcon = (n: number, variant: "start" | "stop" | "end") =>
  L.divIcon({
    html: numberedPinSvg(n, variant),
    className: "bg-transparent",
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -38],
  });

/* ---------- Bounds helper ---------- */

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(positions)]);
  return null;
}

/* ---------- Component ---------- */

type MapViewProps = {
  sales: Sale[];
  routeMode?: boolean;
  routeGeometry?: [number, number][];
  className?: string;
};

export default function MapView({
  sales,
  routeMode = false,
  routeGeometry,
  className = "",
}: MapViewProps) {
  const positions = sales.map((s) => [s.lat, s.lng] as [number, number]);
  const center: [number, number] = positions.length
    ? positions[0]
    : [39.7684, -86.1581];

  // Use routeGeometry (real road geometry) ONLY if we have it; never fall back to
  // straight lines between markers — that's misleading.
  const showRoutePolyline = routeMode && positions.length > 1 && !!routeGeometry && routeGeometry.length > 1;

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-zinc-200 ${className}`}>
      <MapContainer
        center={center}
        zoom={positions.length > 1 ? 11 : 13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", minHeight: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit to show all stops + route */}
        {positions.length > 0 && <FitBounds positions={positions} />}

        {/* Markers — numbered in route mode, plain pin otherwise */}
        {sales.map((sale, idx) => {
          const total = sales.length;
          const variant: "start" | "stop" | "end" =
            idx === 0 ? "start" : idx === total - 1 ? "end" : "stop";
          const icon = routeMode && total > 1 ? numberedIcon(idx + 1, variant) : pinIcon;
          return (
            <Marker key={sale.id} position={[sale.lat, sale.lng]} icon={icon}>
              <Popup>
                <div className="min-w-[12rem]">
                  <p className="font-semibold text-zinc-900">
                    {routeMode && total > 1 && (
                      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white align-middle">
                        {idx + 1}
                      </span>
                    )}
                    {sale.title}
                  </p>
                  <p className="text-xs text-zinc-500">{sale.address}</p>
                  <Link
                    href={`/sales/${sale.id}`}
                    className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                  >
                    View sale →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Road-following route line — only when we have real geometry */}
        {showRoutePolyline && routeGeometry && (
          <>
            {/* Subtle shadow/outline underneath */}
            <Polyline
              positions={routeGeometry}
              pathOptions={{ color: "#1e3a8a", weight: 8, opacity: 0.25 }}
            />
            {/* Main route line */}
            <Polyline
              positions={routeGeometry}
              pathOptions={{ color: "#2563EB", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
