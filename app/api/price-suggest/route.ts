import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const categoryBase: Record<string, number> = {
  Furniture: 75,
  Tools: 40,
  Electronics: 50,
  Clothing: 10,
  Toys: 15,
  Books: 5,
  Sports: 35,
  Collectibles: 45,
  Kitchen: 20,
  Baby: 30,
  Vintage: 40,
};

const conditionMultiplier: Record<string, number> = {
  New: 1,
  "Like New": 0.9,
  Good: 0.7,
  Fair: 0.5,
};

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category, condition = "Good" } = body;

  if (!name || !category) {
    return NextResponse.json(
      { error: "Item name and category are required" },
      { status: 400 }
    );
  }

  // Find similar items by category and optionally name
  const similar = await prisma.item.findMany({
    where: {
      category,
      price: { not: null },
      OR: [
        { name: { contains: name } },
        { sale: { title: { contains: name } } },
      ],
    },
    take: 50,
  });

  const prices = similar
    .map((i) => i.price)
    .filter((p): p is number => p !== null && p > 0);

  let base: number;
  let basedOn = prices.length;

  if (basedOn >= 3) {
    base = median(prices);
  } else {
    // Widen search to category-only items
    const categoryItems = await prisma.item.findMany({
      where: { category, price: { not: null } },
      take: 100,
    });
    const categoryPrices = categoryItems
      .map((i) => i.price)
      .filter((p): p is number => p !== null && p > 0);
    base = categoryPrices.length >= 3 ? median(categoryPrices) : (categoryBase[category] || 25);
    basedOn = categoryPrices.length;
  }

  const multiplier = conditionMultiplier[condition] ?? 0.7;
  const suggested = Math.max(1, Math.round(base * multiplier));
  const rangeLow = Math.max(1, Math.round(suggested * 0.75));
  const rangeHigh = Math.round(suggested * 1.25);

  return NextResponse.json({
    suggested,
    rangeLow,
    rangeHigh,
    condition,
    basedOn,
  });
}
