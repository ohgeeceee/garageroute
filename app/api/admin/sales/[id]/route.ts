import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true, queues: true, messages: true, reservations: { include: { item: true } } },
  });

  if (!sale) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(sale);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const sale = await prisma.sale.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      dates: body.dates,
      hours: body.hours,
      verified: body.verified,
      impactKg: body.impactKg,
      donationRequested: body.donationRequested,
      donationStatus: body.donationStatus,
      donationOrg: body.donationOrg,
    },
    include: { items: true },
  });

  return NextResponse.json(sale);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.sale.delete({
    where: { id },
  });

  await logAudit({
    action: "sale.delete",
    entity: "sale",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
