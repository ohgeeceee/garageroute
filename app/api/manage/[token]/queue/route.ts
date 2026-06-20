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

  const queue = await prisma.queue.findMany({
    where: { saleId: sale.id },
    orderBy: { createdAt: "asc" },
  });

  // Add computed position for waiting entries
  let position = 0;
  const enriched = queue.map((entry) => {
    if (entry.status === "waiting") {
      position += 1;
      return { ...entry, position };
    }
    return { ...entry, position: null };
  });

  return NextResponse.json(enriched);
}
