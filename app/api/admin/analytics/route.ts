import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalSales,
    totalItems,
    totalUsers,
    recentSales,
    itemsByCategory,
    salesByState,
    allSales30d,
  ] = await Promise.all([
    prisma.sale.count(),
    prisma.item.count(),
    prisma.alert.count(),
    prisma.sale.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.item.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.sale.groupBy({ by: ["state"], _count: { _all: true } }),
    prisma.sale.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  // 30-day daily sales series
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().slice(0, 10);
    const count = allSales30d.filter(
      (r) => r.createdAt.toISOString().slice(0, 10) === dateKey
    ).length;
    return { date: dateKey, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), sales: count };
  });

  return NextResponse.json({
    totals: { sales: totalSales, items: totalItems, users: totalUsers, recentSales },
    series,
    itemsByCategory: itemsByCategory
      .map((c) => ({ category: c.category, count: c._count._all }))
      .sort((a, b) => b.count - a.count),
    salesByState: salesByState
      .map((s) => ({ state: s.state || "—", count: s._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  });
}
