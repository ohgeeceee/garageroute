import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const status = searchParams.get("status") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get("pageSize") || "25", 10)));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name:  { contains: q } },
      { city:  { contains: q } },
    ];
  }
  if (status === "active" || status === "suspended" || status === "deleted") where.status = status;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        city: true,
        state: true,
        zip: true,
        status: true,
        verifiedSeller: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { sessions: true, sales: true, verifications: true } },
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
