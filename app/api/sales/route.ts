import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineMiles } from "@/lib/distance";
import { isInTimeWindow, type TimeWindow } from "@/lib/weekend";
import { postSaleToFacebookPage } from "@/lib/bot/fbPost";
import { notifyMatchingBuyersAsync } from "@/lib/bot/leadNotify";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/auth-user";

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
  // includeEnded=1 reveals status='ended' listings (e.g. for the seller manage view).
  // Default: only active sales are returned.
  const includeEnded = searchParams.get("includeEnded") === "1";

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
        // Lifecycle filter — default excludes ended/cancelled. Sellers and admins
        // can opt in via includeEnded=1.
        includeEnded ? {} : { status: "active" },
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
  // Rate limit: 10 sale creations per IP per hour. Signed-in users get a
  // higher per-user limit so power users aren't punished for sharing IPs.
  const user = await getCurrentUser();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rlBucket = user ? `sale:user:${user.id}` : `sale:ip:${ip}`;
  const rl = rateLimit(rlBucket, { limit: user ? 30 : 10, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many listings. Try again in ${Math.ceil(rl.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

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
    photos,
    // Optional fields used by ingest sources (Craigslist, extension, etc.).
    // The web /post form does not set these — they default to "user".
    source,
    sourceUrl,
    sellerEmail,
    sellerName,
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

  // Auto-expiry: 14 days from creation by default. Sellers can override by
  // passing `expiresAt` (ISO string) — used by ingest sources for short-lived feeds.
  const ttlDays = Number.isFinite(Number(body.ttlDays)) ? Number(body.ttlDays) : 14;
  const expiresAt = body.expiresAt
    ? new Date(body.expiresAt)
    : new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  // If a signed-in user is creating the listing, prefer their id as sellerUserId
  // so it shows up on /account/sales and benefits from verifiedSeller once approved.
  const sellerUserId = user?.id ?? null;

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
      seller: seller || sellerName || user?.name || "Anonymous",
      sellerUserId,
      verified: false,
      photos: JSON.stringify(photos || []),
      impactKg: (items?.length || 0) * 1.5,
      // Provenance + TTL.
      source: typeof source === "string" ? source.slice(0, 32) : "user",
      sourceUrl: typeof sourceUrl === "string" ? sourceUrl.slice(0, 1000) : "",
      expiresAt,
      // Tie ingest submissions to the ingest bot user (created lazily later).
      submittedById: sellerUserId,
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

  // Fire-and-forget: auto-post to FB page + notify matching buyers.
  // Failures here MUST NOT affect the API response — the sale is already saved.
  try {
    const itemNames = sale.items.map((i) => i.name);
    const itemCategories = Array.from(
      new Set(sale.items.map((i) => i.category).filter(Boolean))
    );
    const photosParsed =
      typeof sale.photos === "string"
        ? (JSON.parse(sale.photos || "[]") as string[])
        : sale.photos;

    postSaleToFacebookPage({
      id: sale.id,
      title: sale.title,
      city: sale.city,
      state: sale.state,
      zip: sale.zip,
      dates: sale.dates,
      hours: sale.hours,
      description: sale.description,
      verified: sale.verified,
      items: sale.items.map((i) => ({ name: i.name, price: i.price })),
      photos: photosParsed,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[scout:fb-post] background post failed:", err);
    });

    notifyMatchingBuyersAsync({
      id: sale.id,
      title: sale.title,
      type: sale.type,
      city: sale.city,
      state: sale.state,
      zip: sale.zip,
      dates: sale.dates,
      hours: sale.hours,
      description: sale.description,
      itemNames,
      itemCategories,
      itemCount: sale.items.length,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scout:sales-hook] notification dispatch failed:", err);
  }

  // Seller confirmation email — best-effort, never blocks the response.
  // We email the seller if we have an email: either the signed-in user's email,
  // or an explicit `sellerEmail` from the request (used by ingest sources).
  try {
    const recipient = sellerEmail || user?.email;
    if (recipient && isLikelyEmail(recipient)) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const manageUrl = `${appUrl}/manage/${sale.sellerToken}`;
      const publicUrl = `${appUrl}/sales/${sale.id}`;
      await sendEmail({
        to: recipient,
        subject: `Your GarageRoute listing is live: ${sale.title}`,
        text: [
          `Your sale has been published.`,
          ``,
          `Title:    ${sale.title}`,
          `When:     ${sale.dates} (${sale.hours})`,
          `Where:    ${sale.address}, ${sale.city} ${sale.state} ${sale.zip}`,
          `Public:   ${publicUrl}`,
          `Manage:   ${manageUrl}`,
          ``,
          `Save the manage link — it's the only way to update your listing,`,
          `mark items sold, or remove it when the sale is over.`,
        ].join("\n"),
        kind: "sale_published",
        metadata: { saleId: sale.id, manageUrl },
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sales:seller-email] send failed:", err);
  }

  return NextResponse.json(normalizeSale(sale), { status: 201 });
}

function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}