import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; reservationId: string }> }
) {
  const { token, reservationId } = await params;
  const body = await request.json().catch(() => ({}));

  const sale = await prisma.sale.findUnique({
    where: { sellerToken: token },
  });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, saleId: sale.id },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: body.status || reservation.status },
  });

  return NextResponse.json(updated);
}
