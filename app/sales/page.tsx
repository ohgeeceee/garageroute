import { getCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import SalesBrowser from "./SalesBrowser";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const user = await getCurrentUser();
  let initialFavoriteIds: string[] = [];
  if (user) {
    const favs = await prisma.favorite.findMany({
      where: { userId: user.id },
      select: { saleId: true },
    });
    initialFavoriteIds = favs.map((f) => f.saleId);
  }
  return <SalesBrowser loggedIn={!!user} initialFavoriteIds={initialFavoriteIds} />;
}