import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-user";

/**
 * Geocoding endpoint. Two modes:
 *   ?zip=80202  — forward-geocode a US zip via Nominatim (cached to data/zip-cache.json)
 *   ?lat=..&lng=.. — reverse-geocode coordinates
 *
 * Caches zip → {lat, lng, city, state, zip} in data/zip-cache.json so repeat
 * requests stay under Nominatim's 1 req/sec limit.
 */

type CachedEntry = {
  lat: number;
  lng: number;
  city: string;
  state: string;
  zip: string;
};

const CACHE_PATH = "data/zip-cache.json";

async function readCache(): Promise<Record<string, CachedEntry>> {
  const fs = await import("node:fs/promises");
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeCache(cache: Record<string, CachedEntry>): Promise<void> {
  const fs = await import("node:fs/promises");
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function geocodeViaNominatim(query: string): Promise<CachedEntry | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { "User-Agent": "GarageRoute/1.0 (prototype)" },
    });
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const address = data[0].address || {};
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      city: address.city || address.town || address.village || "",
      state: address.state || "",
      zip: address.postcode || "",
    };
  } catch (err) {
    console.error("Nominatim geocode failed:", err);
    return null;
  }
}

async function reverseGeocodeViaNominatim(
  lat: number,
  lng: number
): Promise<CachedEntry | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "GarageRoute/1.0 (prototype)" },
    });
    const data = await res.json();
    if (!data || data.error) return null;
    const address = data.address || {};
    return {
      lat,
      lng,
      city: address.city || address.town || address.village || address.county || "",
      state: address.state || "",
      zip: address.postcode || "",
    };
  } catch (err) {
    console.error("Nominatim reverse-geocode failed:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const zip = searchParams.get("zip")?.trim();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  // Reverse geocode (no cache; rare path).
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
    }
    const result = await reverseGeocodeViaNominatim(latNum, lngNum);
    if (!result) {
      // Return coords without city/state rather than failing the whole flow.
      return NextResponse.json({ lat: latNum, lng: lngNum, city: "", state: "", zip: "" });
    }
    return NextResponse.json(result);
  }

  // Forward geocode a zip.
  if (!zip) {
    return NextResponse.json({ error: "Missing zip or lat/lng" }, { status: 400 });
  }
  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    return NextResponse.json({ error: "Invalid US zip format" }, { status: 400 });
  }

  const cache = await readCache();
  if (cache[zip]) {
    return NextResponse.json(cache[zip]);
  }

  const result = await geocodeViaNominatim(`${zip}, USA`);
  if (!result) {
    return NextResponse.json({ error: "Zip not found" }, { status: 404 });
  }
  cache[zip] = { ...result, zip };
  await writeCache(cache);

  // If logged in, persist to User.
  const user = await getCurrentUser();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        homeLat: result.lat,
        homeLng: result.lng,
        homeZip: zip,
      },
    });
  }

  return NextResponse.json(cache[zip]);
}