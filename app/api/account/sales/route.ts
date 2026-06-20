import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, auditUser } from "@/lib/auth-user";
import { getStorage, ownerOfKey } from "@/lib/storage";

const MAX_PHOTOS_PER_SALE = 8;

/* ---------- helpers ---------- */
function trim(s: unknown, max: number, fallback = ""): string {
  const v = String(s ?? "").trim();
  return v.length > max ? v.slice(0, max) : v || fallback;
}
function num(s: unknown, fallback = 0): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const rows = await prisma.sale.findMany({
    where: { sellerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      city: true,
      state: true,
      zip: true,
      dates: true,
      type: true,
      verified: true,
      donationStatus: true,
      sellerToken: true,
      createdAt: true,
      _count: { select: { items: true, queues: true, messages: true, reservations: true } },
    },
  });
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }

  if (!user.verifiedSeller) {
    return NextResponse.json(
      { error: "Only verified sellers can post sales. Submit verification first." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = trim(body.title, 120);
  const type = trim(body.type, 40, "garage");
  const address = trim(body.address, 200);
  const city = trim(body.city, 80, user.city);
  const state = trim(body.state, 4, user.state);
  const zip = trim(body.zip, 12, user.zip);
  const dates = trim(body.dates, 200);
  const hours = trim(body.hours, 120);
  const description = trim(body.description, 2000);
  const lat = num(body.lat);
  const lng = num(body.lng);

  if (!title || !address || !city || !state || !zip) {
    return NextResponse.json(
      { error: "Title, address, city, state, and ZIP are required." },
      { status: 400 },
    );
  }

  // Photos: client uploads directly to S3 (presigned PUT) then sends the
  // resulting keys here. We resolve them to public URLs at the API edge so
  // the rest of the app (FB share, email, browse page) keeps working with
  // plain URLs and we can swap CDN later without rewriting the DB.
  let photosJson = "[]";
  if (body.photoKeys !== undefined) {
    if (!Array.isArray(body.photoKeys)) {
      return NextResponse.json({ error: "photoKeys must be an array" }, { status: 400 });
    }
    const keys = body.photoKeys.map((k) => String(k)).slice(0, MAX_PHOTOS_PER_SALE);
    if (keys.length !== body.photoKeys.length) {
      return NextResponse.json(
        { error: `Too many photos. Max ${MAX_PHOTOS_PER_SALE}.` },
        { status: 400 },
      );
    }
    for (const k of keys) {
      if (ownerOfKey(k) !== user.id) {
        return NextResponse.json({ error: "Foreign photo key rejected" }, { status: 403 });
      }
    }
    const storage = getStorage();
    const urls = keys.map((k) => storage.resolvePublicUrl(k) ?? k);
    photosJson = JSON.stringify(urls);
  }

  const sale = await prisma.sale.create({
    data: {
      title,
      type,
      address,
      city,
      state,
      zip,
      lat,
      lng,
      dates,
      hours,
      description,
      seller: user.name,
      sellerUserId: user.id,
      photos: photosJson,
    },
    select: { id: true, title: true, sellerToken: true, photos: true, createdAt: true },
  });

  await auditUser("sale.create", sale.id, { via: "account", sellerUserId: user.id });
  return NextResponse.json({ ok: true, sale });
}

/**
 * PATCH /api/account/sales/:id — moved to ./[id]/route.ts
 *
 * (This endpoint used to live here too, but Next's static analysis flagged it:
 * the no-param route shouldn't export PATCH. The PATCH handler is now in
 * ./[id]/route.ts which correctly receives the { id } param.)
 */
