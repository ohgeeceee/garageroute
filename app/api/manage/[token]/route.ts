import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  request: Request,
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
  } = body;

  const updateData: Record<string, unknown> = {};
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

  const sale = await prisma.sale.update({
    where: { sellerToken: token },
    data: updateData,
    include: { items: true },
  });

  return NextResponse.json(normalizeSale(sale));
}
