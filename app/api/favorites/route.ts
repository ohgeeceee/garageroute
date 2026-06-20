import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-user";

/**
 * GET  /api/favorites — list current user's favorited sales (with full sale data)
 * POST /api/favorites — body: { saleId } — add to favorites
 */

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { sale: { include: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    favorites.map((f) => ({ ...normalizeSale(f.sale), favoritedAt: f.createdAt }))
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
  if (!saleId) {
    return NextResponse.json({ error: "Missing saleId" }, { status: 400 });
  }

  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  await prisma.favorite.upsert({
    where: { userId_saleId: { userId: user.id, saleId } },
    create: { userId: user.id, saleId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}