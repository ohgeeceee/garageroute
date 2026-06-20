import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function findSaleAndItem(token: string, itemId: string) {
  const sale = await prisma.sale.findUnique({
    where: { sellerToken: token },
    include: { items: { where: { id: itemId } } },
  });
  if (!sale) return { error: "Sale not found", status: 404 } as const;
  if (sale.items.length === 0) return { error: "Item not found", status: 404 } as const;
  return { sale, item: sale.items[0] };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; itemId: string }> }
) {
  const { token, itemId } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await findSaleAndItem(token, itemId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = String(body.name).trim();
  if (body.category !== undefined) updateData.category = String(body.category).trim();
  if (body.condition !== undefined) updateData.condition = String(body.condition).trim();
  if (body.price !== undefined) updateData.price = body.price ? Number(body.price) : null;
  if (body.photo !== undefined) updateData.photo = body.photo ? String(body.photo).trim() : null;
  if (body.sold !== undefined) updateData.sold = Boolean(body.sold);

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string; itemId: string }> }
) {
  const { token, itemId } = await params;

  const result = await findSaleAndItem(token, itemId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await prisma.item.delete({ where: { id: itemId } });

  // Recalculate impact estimate
  const itemCount = await prisma.item.count({ where: { saleId: result.sale.id } });
  await prisma.sale.update({
    where: { id: result.sale.id },
    data: { impactKg: itemCount * 1.5 },
  });

  return NextResponse.json({ success: true });
}
