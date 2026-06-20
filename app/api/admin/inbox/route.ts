import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/inbox
 *
 * Returns EmailThreads ordered by most recent activity, with a snippet
 * and last-direction badge for the list view.
 *
 * Query params:
 *   status   — "open" | "closed" | "archived" | "all"   (default "open")
 *   q        — free-text search across subject + snippet + fromEmail
 *   take     — limit (default 50, max 200)
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "open";
  const q = (sp.get("q") || "").trim();
  const take = Math.min(Math.max(parseInt(sp.get("take") || "50", 10) || 50, 1), 200);

  const where: Record<string, unknown> = {};
  if (status !== "all") {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { fromEmail: { contains: q } },
      { fromName: { contains: q } },
      { lastSnippet: { contains: q } },
    ];
  }

  const [threads, totals, unread] = await Promise.all([
    prisma.emailThread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take,
      select: {
        id: true,
        subject: true,
        fromEmail: true,
        fromName: true,
        status: true,
        lastMessageAt: true,
        lastSnippet: true,
        lastDirection: true,
        lastReadAt: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
    }),
    prisma.emailThread.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.emailThread.count({
      where: { lastReadAt: null, status: "open" },
    }),
  ]);

  return NextResponse.json({
    threads,
    counts: {
      open: totals.find((t) => t.status === "open")?._count._all ?? 0,
      closed: totals.find((t) => t.status === "closed")?._count._all ?? 0,
      archived: totals.find((t) => t.status === "archived")?._count._all ?? 0,
      unreadOpen: unread,
    },
  });
}