/**
 * Client-side location helpers.
 * Reads/writes the user's home location from localStorage and asks the browser
 * for geolocation when explicitly requested.
 *
 * Anonymous users store locally; signed-in users also persist on the User row
 * via the geocode/profile endpoints.
 */

export type StoredLocation = {
  lat: number;
  lng: number;
  zip?: string;
  city?: string;
  state?: string;
  /** ISO timestamp */
  capturedAt: string;
};

const KEY = "gr:home_location:v1";
const STALE_AFTER_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function getStoredLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocation;
    if (!parsed.lat || !parsed.lng) return null;
    const age = Date.now() - new Date(parsed.capturedAt).getTime();
    if (Number.isFinite(age) && age > STALE_AFTER_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredLocation(loc: Omit<StoredLocation, "capturedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...loc, capturedAt: new Date().toISOString() })
    );
  } catch {
    /* localStorage unavailable — best-effort */
  }
}

export function clearStoredLocation(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export type GeoResult = { ok: true; location: StoredLocation } | { ok: false; reason: string };

export async function requestBrowserGeolocation(): Promise<GeoResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "Geolocation is not supported in this browser." };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse-geocode to a zip/city via server endpoint.
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            resolve({
              ok: true,
              location: {
                lat,
                lng,
                zip: data.zip || "",
                city: data.city || "",
                state: data.state || "",
                capturedAt: new Date().toISOString(),
              },
            });
            return;
          }
        } catch {
          /* fall through */
        }
        resolve({
          ok: true,
          location: { lat, lng, capturedAt: new Date().toISOString() },
        });
      },
      (err) => resolve({ ok: false, reason: err.message || "Permission denied." }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

export async function geocodeZip(zip: string): Promise<GeoResult> {
  try {
    const res = await fetch(`/api/geocode?zip=${encodeURIComponent(zip)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, reason: data.error || "Could not find that zip code." };
    }
    const data = await res.json();
    return {
      ok: true,
      location: {
        lat: data.lat,
        lng: data.lng,
        zip: data.zip || zip,
        city: data.city || "",
        state: data.state || "",
        capturedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { ok: false, reason: (err as Error).message || "Network error." };
  }
}