export type RoutePoint = {
  lat: number;
  lng: number;
};

export type RouteDirections = {
  geometry: [number, number][];
  distanceMiles: number;
  durationMinutes: number;
  legs: {
    distanceMiles: number;
    durationMinutes: number;
  }[];
};

function toMiles(meters: number): number {
  return meters / 1609.344;
}

function toMinutes(seconds: number): number {
  return seconds / 60;
}

export async function fetchRouteDirections(
  points: RoutePoint[]
): Promise<RouteDirections | null> {
  if (points.length < 2) return null;

  const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error("OSRM returned no routes");
    }

    const route = data.routes[0];
    const geometry = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );

    return {
      geometry,
      distanceMiles: toMiles(route.distance),
      durationMinutes: toMinutes(route.duration),
      legs: route.legs.map((leg: { distance: number; duration: number }) => ({
        distanceMiles: toMiles(leg.distance),
        durationMinutes: toMinutes(leg.duration),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch route directions:", error);
    return null;
  }
}
