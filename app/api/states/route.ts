import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get("status") || "";
  const statusList = statusParam
    ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const states = await prisma.state.findMany({
    where: statusList ? { status: { in: statusList } } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // SQLite + Prisma don't support mode: "insensitive", so use raw SQL
  // to build case-insensitive count maps keyed by State.name title-case.
  const allStates = await prisma.state.findMany({ select: { name: true } });
  const stateNames = allStates.map((s) => s.name);

  const stateSaleCounts = await prisma.$queryRaw<{ state: string; _count: bigint }[]>`
    SELECT state, COUNT(*) as _count FROM Sale GROUP BY state
  `;
  const saleCountMap: Record<string, number> = {};
  for (const row of stateSaleCounts) {
    const name = stateNames.find(
      (n) => n.toLowerCase() === (row.state || "").toLowerCase()
    );
    if (name) saleCountMap[name] = Number(row._count);
  }

  const stateSellerCounts = await prisma.$queryRaw<{ state: string; _count: bigint }[]>`
    SELECT state, COUNT(*) as _count FROM User GROUP BY state
  `;
  const sellerCountMap: Record<string, number> = {};
  for (const row of stateSellerCounts) {
    const name = stateNames.find(
      (n) => n.toLowerCase() === (row.state || "").toLowerCase()
    );
    if (name) sellerCountMap[name] = Number(row._count);
  }

  const result = states.map((state) => ({
    slug: state.slug,
    name: state.name,
    abbreviation: state.abbreviation,
    tagline: state.tagline,
    heroImage: state.heroImage,
    status: state.status,
    launchDate: state.launchDate ? state.launchDate.toISOString() : null,
    saleCount: saleCountMap[state.name] ?? 0,
    sellerCount: sellerCountMap[state.name] ?? 0,
    targetCities: (() => {
      try { return JSON.parse(state.targetCities) as string[]; }
      catch { return []; }
    })(),
  }));

  return NextResponse.json({ states: result });
}
