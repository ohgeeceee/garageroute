import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      senderName: true,
      senderEmail: true,
      content: true,
      createdAt: true,
      sale: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json(rows);
}
