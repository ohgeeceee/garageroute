import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineMiles } from "@/lib/distance";
import { isInTimeWindow, type TimeWindow } from "@/lib/weekend";

function normalizeSale<T extends { photos: string | string[] }>(
  sale: T
): Omit<T, "photos"> & { photos: string[] } {
  return {
    ...sale,
    photos:
      typeof sale.photos === "string"
        ? JSON.parse(sale.photos || "[]")
        : sale.photos,
  };
}

async function geocodeAddress(address: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "GarageRoute/1.0 (prototype)" },
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (err) {
    console.error("Geocoding failed:", err);
  }
  // Fallback to Indianapolis center
  return { lat: 39.7684, lng: -86.1581 };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query")?.trim() || "";
  const type = searchParams.get("type") || "";
  const categoryParam = searchParams.get("category") || "";
  const categoryList = categoryParam
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const verifiedOnly = searchParams.get("verifiedOnly") === "true";

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");
  const when = (searchParams.get("when") || "all") as TimeWindow;

  const latNum = lat ? parseFloat(lat) : null;
  const lngNum = lng ? parseFloat(lng) : null;
  const radiusNum = radius ? parseFloat(radius) : null;
  const hasLocation =
    latNum !== null && lngNum !== null && !Number.isNaN(latNum) && !Number.isNaN(lngNum);

  const sales = await prisma.sale.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { title: { contains: query } },
                { address: { contains: query } },
                { city: { contains: query } },
                { description: { contains: query } },
                {
                  items: {
                    some: { name: { contains: query } },
                  },
                },
              ],
            }
          : {},
        type ? { type } : {},
        // verifiedOnly now matches EITHER Sale.verified OR seller.verifiedSeller.
        verifiedOnly
          ? {
              OR: [{ verified: true }, { sellerUser: { is: { verifiedSeller: true } } }],
            }
          : {},
        categoryList.length
          ? { items: { some: { category: { in: categoryList } } } }
          : {},
      ],
    },
    include: { items: true, sellerUser: { select: { verifiedSeller: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Decorate each sale with:
  //  - sellerVerifiedSeller: boolean
  //  - verifiedOverall: boolean (either flag)
  //  - distanceMi: number | null (when location supplied)
  let decorated = sales.map((sale) => {
    const sellerVerified = sale.sellerUser?.verifiedSeller ?? false;
    const verifiedOverall = sale.verified || sellerVerified;
    let distanceMi: number | null = null;
    if (hasLocation && sale.lat != null && sale.lng != null) {
      distanceMi = haversineMiles(
        { lat: latNum as number, lng: lngNum as number },
        { lat: sale.lat, lng: sale.lng }
      );
    }
    return {
      ...sale,
      sellerVerifiedSeller: sellerVerified,
      verifiedOverall,
      // Don't pollute the existing `verified` shape; callers can opt into the
      // combined flag via `verifiedOverall`. Keep `verified` for back-compat.
      verified: verifiedOverall,
      distanceMi,
    };
  });

  // Time-window filter (lenient — unparseable dates always included).
  if (when !== "all") {
    decorated = decorated.filter((s) => isInTimeWindow(s.dates, when));
  }

  // Distance filter + sort.
  if (hasLocation && radiusNum && radiusNum > 0) {
    decorated = decorated.filter(
      (s) => s.distanceMi !== null && s.distanceMi <= radiusNum
    );
    decorated.sort((a, b) => {
      const da = a.distanceMi ?? Infinity;
      const db = b.distanceMi ?? Infinity;
      return da - db;
    });
  } else if (hasLocation) {
    // No radius — still sort by distance.
    decorated.sort((a, b) => {
      const da = a.distanceMi ?? Infinity;
      const db = b.distanceMi ?? Infinity;
      return da - db;
    });
  }

  return NextResponse.json(decorated.map(normalizeSale));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    title,
    type,
    address,
    city,
    state,
    zip,
    dates,
    hours,
    description,
    seller,
    items,
  } = body;

  if (!title || !address || !city || !dates || !hours) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { lat, lng } = await geocodeAddress(
    `${address}, ${city || ""}, ${state || ""} ${zip || ""}`
  );

  const sale = await prisma.sale.create({
    data: {
      title,
      type: type || "Garage/Yard Sale",
      address,
      city: city || "",
      state: state || "",
      zip: zip || "",
      lat,
      lng,
      dates,
      hours,
      description: description || "",
      seller: seller || "Anonymous",
      verified: false,
      photos: JSON.stringify(body.photos || []),
      impactKg: (items?.length || 0) * 1.5,
      items: {
        create:
          items?.map((item: Record<string, unknown>) => ({
            name: typeof item.name === "string" ? item.name : "Unnamed item",
            category:
              typeof item.category === "string" ? item.category : "Other",
            price:
              typeof item.price === "string" || typeof item.price === "number"
                ? parseFloat(String(item.price))
                : null,
            condition:
              typeof item.condition === "string" ? item.condition : "Good",
            photo:
              typeof item.photo === "string" ? item.photo : null,
          })) || [],
      },
    },
    include: { items: true },
  });

  return NextResponse.json(normalizeSale(sale), { status: 201 });
}