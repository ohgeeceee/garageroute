import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "all"; // all | verified | pending
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get("pageSize") ?? "20", 10)));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title:    { contains: q } },
      { seller:   { contains: q } },
      { city:     { contains: q } },
      { address:  { contains: q } },
      { zip:      { contains: q } },
    ];
  }
  if (status === "verified") where.verified = true;
  if (status === "pending")  where.verified = false;

  const [total, rows] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        seller: true,
        city: true,
        state: true,
        zip: true,
        dates: true,
        type: true,
        verified: true,
        donationStatus: true,
        sellerToken: true,
        createdAt: true,
        _count: { select: { items: true, queues: true, messages: true, reservations: true } },
      },
    }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ids, verified } = (await req.json()) as { ids: string[]; verified: boolean };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  const result = await prisma.sale.updateMany({
    where: { id: { in: ids } },
    data: { verified },
  });
  await logAudit({
    action: verified ? "sale.bulk_verify" : "sale.bulk_verify",
    entity: "sale",
    metadata: { count: result.count, verified, idsPreview: ids.slice(0, 5) },
  });
  return NextResponse.json({ updated: result.count });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ids } = (await req.json()) as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  const result = await prisma.sale.deleteMany({
    where: { id: { in: ids } },
  });
  await logAudit({
    action: "sale.delete",
    entity: "sale",
    metadata: { count: result.count, idsPreview: ids.slice(0, 5) },
  });
  return NextResponse.json({ deleted: result.count });
}
