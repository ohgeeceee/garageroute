import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";

/* Lists messages across all sales owned by the current user, grouped by sale */
export async function GET() {
  let user;
  try { user = await requireUser(); } catch (r) { return r as Response; }

  const sales = await prisma.sale.findMany({
    where: { sellerUserId: user.id },
    select: { id: true, title: true, messages: { orderBy: { createdAt: "desc" }, take: 25 } },
    orderBy: { createdAt: "desc" },
  });

  const totalUnread = sales.reduce((n, s) => n + s.messages.length, 0);
  return NextResponse.json({ sales, totalUnread });
}
