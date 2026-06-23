import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const SALE_STATUSES = ["active", "ended", "cancelled"] as const;

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

/**
 * Re-geocode an address using Nominatim. Returns the existing lat/lng on
 * failure so a seller never accidentally moves their sale to the middle
 * of the ocean because Nominatim rate-limited them.
 */
async function geocodeAddress(
  address: string,
  fallback: { lat: number; lng: number }
): Promise<{ lat: number; lng: number }> {
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
    console.error("[manage] geocode failed:", err);
  }
  return fallback;
}

function diffKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return diff;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const sale = await prisma.sale.findUnique({
    where: { sellerToken: token },
    include: { items: true },
  });

  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  return NextResponse.json(normalizeSale(sale));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = await prisma.sale.findUnique({
    where: { sellerToken: token },
  });
  if (!existing) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

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
    verified,
    photos,
    status,
    statusNote,
  } = body;

  const updateData: Record<string, unknown> = {};

  // Scalar fields — only patch what was sent.
  if (title !== undefined) updateData.title = String(title).trim();
  if (type !== undefined) updateData.type = String(type).trim();
  if (address !== undefined) updateData.address = String(address).trim();
  if (city !== undefined) updateData.city = String(city).trim();
  if (state !== undefined) updateData.state = String(state).trim();
  if (zip !== undefined) updateData.zip = String(zip).trim();
  if (dates !== undefined) updateData.dates = String(dates).trim();
  if (hours !== undefined) updateData.hours = String(hours).trim();
  if (description !== undefined) updateData.description = String(description).trim();
  if (seller !== undefined) updateData.seller = String(seller).trim();
  if (verified !== undefined) updateData.verified = Boolean(verified);
  if (photos !== undefined) updateData.photos = JSON.stringify(photos);

  // Status transition — validate enum, stamp changedAt.
  let statusTransition: { from: string; to: string } | null = null;
  if (status !== undefined) {
    if (!SALE_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${SALE_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (status !== existing.status) {
      statusTransition = { from: existing.status, to: status };
      updateData.status = status;
      updateData.statusChangedAt = new Date();
    }
  }
  if (statusNote !== undefined) {
    updateData.statusNote = String(statusNote).trim();
  }

  // Re-geocode only if address fields actually changed. Lat/lng start as the
  // existing values so a Nominatim failure preserves the current pin.
  const addressChanged =
    (address !== undefined && address !== existing.address) ||
    (city !== undefined && city !== existing.city) ||
    (state !== undefined && state !== existing.state) ||
    (zip !== undefined && zip !== existing.zip);

  if (addressChanged) {
    const nextAddress =
      `${updateData.address ?? existing.address}, ${updateData.city ?? existing.city}, ${updateData.state ?? existing.state} ${updateData.zip ?? existing.zip}`;
    const { lat, lng } = await geocodeAddress(nextAddress, {
      lat: existing.lat,
      lng: existing.lng,
    });
    updateData.lat = lat;
    updateData.lng = lng;
  }

  const sale = await prisma.sale.update({
    where: { sellerToken: token },
    data: updateData,
    include: { items: true },
  });

  // Audit log — capture every diff so we can answer "who changed the hours
  // on sale X last week" without grepping server logs.
  try {
    const before: Record<string, unknown> = {
      title: existing.title,
      type: existing.type,
      address: existing.address,
      city: existing.city,
      state: existing.state,
      zip: existing.zip,
      dates: existing.dates,
      hours: existing.hours,
      description: existing.description,
      seller: existing.seller,
      verified: existing.verified,
      status: existing.status,
    };
    const after: Record<string, unknown> = {
      title: sale.title,
      type: sale.type,
      address: sale.address,
      city: sale.city,
      state: sale.state,
      zip: sale.zip,
      dates: sale.dates,
      hours: sale.hours,
      description: sale.description,
      seller: sale.seller,
      verified: sale.verified,
      status: sale.status,
    };
    const changed = diffKeys(before, after);
    if (Object.keys(changed).length > 0 || statusTransition) {
      await logAudit({
        actor: `seller:${sale.id}`,
        action: "sale.update",
        entity: "sale",
        entityId: sale.id,
        metadata: {
          token,
          statusTransition,
          changed,
          addressRegeocoded: addressChanged,
        },
      });
    }
  } catch {
    // logAudit already swallows + logs internally — never block the response.
  }

  return NextResponse.json(normalizeSale(sale));
}
