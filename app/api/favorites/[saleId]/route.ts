import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-user";

/**
 * DELETE /api/favorites/[saleId] — remove a favorite.
 */

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { saleId } = await params;
  if (!saleId) {
    return NextResponse.json({ error: "Missing saleId" }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: { userId: user.id, saleId },
  });

  return NextResponse.json({ ok: true });
}