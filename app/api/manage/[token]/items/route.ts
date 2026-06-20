import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  const sale = await prisma.sale.findUnique({
    where: { sellerToken: token },
  });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const condition = String(body.condition || "Good").trim();
  const price = body.price ? Number(body.price) : null;
  const photo = body.photo ? String(body.photo).trim() : null;

  if (!name || !category) {
    return NextResponse.json(
      { error: "Name and category are required" },
      { status: 400 }
    );
  }

  const item = await prisma.item.create({
    data: {
      name,
      category,
      condition,
      price,
      photo,
      saleId: sale.id,
    },
  });

  // Bump impact estimate when inventory grows
  const itemCount = await prisma.item.count({ where: { saleId: sale.id } });
  await prisma.sale.update({
    where: { id: sale.id },
    data: { impactKg: itemCount * 1.5 },
  });

  return NextResponse.json(item, { status: 201 });
}
