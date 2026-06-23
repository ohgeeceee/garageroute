import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { getStateBySlug } from "@/lib/state";
import SalesBrowser from "./SalesBrowser";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const reqHeaders = await headers();
  const stateSlug = reqHeaders.get("x-state-slug");
  const stateName = reqHeaders.get("x-state-name");

  const user = await getCurrentUser();
  let initialFavoriteIds: string[] = [];
  if (user) {
    const favs = await prisma.favorite.findMany({
      where: { userId: user.id },
      select: { saleId: true },
    });
    initialFavoriteIds = favs.map((f) => f.saleId);
  }

  // Resolve centroid if on a state subdomain
  let stateCentroid: { lat: number; lng: number } | undefined;
  if (stateSlug) {
    const state = await getStateBySlug(stateSlug);
    if (state && typeof state.lat === "number" && typeof state.lng === "number") {
      stateCentroid = { lat: state.lat, lng: state.lng };
    }
  }

  return (
    <SalesBrowser
      loggedIn={!!user}
      initialFavoriteIds={initialFavoriteIds}
      stateName={stateName ?? undefined}
      stateCentroid={stateCentroid}
    />
  );
}
