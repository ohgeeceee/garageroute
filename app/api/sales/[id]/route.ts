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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  // Strip seller-only fields before returning to public callers.
  const { sellerToken: _, sellerEmail: __, ...publicSale } = normalizeSale(sale);
  return NextResponse.json(publicSale);
}
