import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { verified } = (await req.json()) as { verified: boolean };
  const sale = await prisma.sale.update({
    where: { id },
    data: { verified: Boolean(verified) },
    select: { id: true, verified: true },
  });
  await logAudit({
    action: verified ? "sale.verify" : "sale.unverify",
    entity: "sale",
    entityId: id,
  });
  return NextResponse.json(sale);
}
