import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    sales,
    items,
    queues,
    messages,
    reservations,
    alerts,
    pendingVerifications,
    recentSales,
    recentMessages,
  ] = await Promise.all([
    prisma.sale.count(),
    prisma.item.count(),
    prisma.queue.count(),
    prisma.message.count(),
    prisma.reservation.count(),
    prisma.alert.count(),
    prisma.sale.count({ where: { verified: false } }),
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        seller: true,
        city: true,
        state: true,
        verified: true,
        createdAt: true,
      },
    }),
    prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        senderName: true,
        content: true,
        createdAt: true,
        sale: { select: { id: true, title: true } },
      },
    }),
  ]);

  // Build a simple 7-day series from createdAt — grouped by date
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await prisma.sale.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true },
  });

  const series = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().slice(0, 10);
    const count = recent.filter(
      (r) => r.createdAt.toISOString().slice(0, 10) === dateKey
    ).length;
    return { date: dateKey, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), sales: count };
  });

  const itemsByCategory = await prisma.item.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  const topCategories = itemsByCategory
    .map((c) => ({ category: c.category, count: c._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return NextResponse.json({
    counts: {
      sales,
      items,
      queue: queues,
      messages,
      reservations,
      alerts,
      pendingVerifications,
    },
    series,
    topCategories,
    recentSales,
    recentMessages,
  });
}
