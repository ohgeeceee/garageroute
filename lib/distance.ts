/**
 * Distance helpers — Haversine + bounding-box pre-filter.
 * Miles are the user-facing unit.
 */

const EARTH_RADIUS_MI = 3958.7613;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Returns a SQL-friendly bounding box (lat/lng min/max) covering approximately
 * `radiusMi` from (lat, lng). Use this to pre-filter the DB before exact
 * Haversine — keeps large tables fast.
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusMi: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMi / 69; // ~69 mi per degree latitude
  const lngDelta = radiusMi / (69 * Math.cos(toRad(lat)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return "<0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}