import { prisma } from "@/lib/prisma";

/**
 * Returns the centroid (lat, lng) of a state from the State table's lat/lng fields.
 */
export async function getStateCenter(slug: string): Promise<{ lat: number; lng: number } | null> {
  const state = await prisma.state.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { lat: true, lng: true },
  });
  if (!state) return null;
  return { lat: state.lat, lng: state.lng };
}

/**
 * Check whether a (lat, lng) point falls within a state's bounding box.
 * Returns true if the state has no bounding box defined (open state).
 */
export async function pointInStateBBox(
  slug: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const state = await prisma.state.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { minLat: true, maxLat: true, minLng: true, maxLng: true },
  });

  if (!state) return false;

  // No bbox defined — treat as open (allow)
  if (
    state.minLat == null ||
    state.maxLat == null ||
    state.minLng == null ||
    state.maxLng == null
  ) {
    return true;
  }

  return (
    lat >= state.minLat &&
    lat <= state.maxLat &&
    lng >= state.minLng &&
    lng <= state.maxLng
  );
}
