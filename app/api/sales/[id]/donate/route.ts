import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const allowedOrgs = [
  "Goodwill",
  "Habitat for Humanity",
  "Salvation Army",
  "Local Charity",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { org, sellerToken } = body;

  if (!org || !allowedOrgs.includes(org)) {
    return NextResponse.json({ error: "Invalid organization" }, { status: 400 });
  }

  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale || sale.sellerToken !== sellerToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      donationRequested: true,
      donationOrg: org,
      donationStatus: "pending",
    },
  });

  return NextResponse.json(updated);
}
