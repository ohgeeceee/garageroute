import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.sale.findMany({
    where: { verified: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      seller: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      dates: true,
      hours: true,
      description: true,
      photos: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(pending);
}
