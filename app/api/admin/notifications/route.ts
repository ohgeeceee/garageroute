import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the count of pending items across the admin queues.
 * Used by the sidebar badge so admins see at-a-glance what needs attention.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [sellerVerifications, saleVerifications, unreadMessages, unreadInbox] = await Promise.all([
    prisma.userVerification.count({ where: { status: "pending" } }),
    prisma.sale.count({ where: { verified: false } }),
    prisma.message.count(),
    prisma.emailThread.count({ where: { status: "open", lastReadAt: null } }),
  ]);
  return NextResponse.json({
    sellerVerifications,
    saleVerifications,
    unreadMessages,
    unreadInbox,
    total: sellerVerifications + saleVerifications + unreadInbox,
  });
}
