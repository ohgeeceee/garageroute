import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, email, partySize } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const entry = await prisma.queue.create({
    data: {
      saleId: id,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      partySize: Math.max(1, Number(partySize || 1)),
      status: "waiting",
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
