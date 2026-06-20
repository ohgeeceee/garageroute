import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") || 25)));
  const action = searchParams.get("action") || "";
  const actor = searchParams.get("actor") || "";
  const entity = searchParams.get("entity") || "";

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (actor) where.actor = actor;
  if (entity) where.entity = entity;

  const [total, logs, actionGroups, actorGroups] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.auditLog.groupBy({
      by: ["actor"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    rows: logs,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      actions: actionGroups.map((g) => ({ action: g.action, count: g._count._all })),
      actors: actorGroups.map((g) => ({ actor: g.actor, count: g._count._all })),
    },
  });
}
