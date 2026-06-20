"use client";

import { useEffect, useState, ComponentType } from "react";
import { Sale } from "@/data/sales";

type MapViewProps = {
  sales: Sale[];
  routeMode?: boolean;
  routeGeometry?: [number, number][];
  className?: string;
};

export default function DynamicMap({
  sales,
  routeMode = false,
  routeGeometry,
  className = "",
}: MapViewProps) {
  const [MapView, setMapView] = useState<ComponentType<MapViewProps> | null>(
    null
  );

  useEffect(() => {
    import("@/components/MapView").then((mod) => {
      setMapView(() => mod.default);
    });
  }, []);

  if (!MapView) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-500 ${className}`}
      >
        Loading map…
      </div>
    );
  }

  return (
    <MapView
      sales={sales}
      routeMode={routeMode}
      routeGeometry={routeGeometry}
      className={className}
    />
  );
}
