import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const state = await prisma.state.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  if (!state) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  return NextResponse.json({
    state: {
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
      bounds:
        state.minLat != null &&
        state.maxLat != null &&
        state.minLng != null &&
        state.maxLng != null
          ? { minLat: state.minLat, maxLat: state.maxLat, minLng: state.minLng, maxLng: state.maxLng }
          : null,
      centroid: { lat: state.lat, lng: state.lng },
    },
  });
}
