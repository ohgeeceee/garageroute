import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; queueId: string }> }
) {
  const { token, queueId } = await params;
  const body = await request.json().catch(() => ({}));

  const sale = await prisma.sale.findUnique({
    where: { sellerToken: token },
  });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const entry = await prisma.queue.findFirst({
    where: { id: queueId, saleId: sale.id },
  });
  if (!entry) {
    return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
  }

  const updated = await prisma.queue.update({
    where: { id: queueId },
    data: { status: body.status || entry.status },
  });

  return NextResponse.json(updated);
}
