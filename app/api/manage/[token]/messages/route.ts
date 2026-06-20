import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const sale = await prisma.sale.findUnique({
    where: { sellerToken: token },
  });

  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { saleId: sale.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
