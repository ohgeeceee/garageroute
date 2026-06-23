import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json();

  const existing = await prisma.state.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.state.update({
    where: { slug: slug.toLowerCase() },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.launchDate !== undefined && {
        launchDate: body.launchDate ? new Date(body.launchDate) : null,
      }),
      ...(body.tagline !== undefined && { tagline: body.tagline }),
      ...(body.heroImage !== undefined && { heroImage: body.heroImage }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.targetCities !== undefined && {
        targetCities: JSON.stringify(body.targetCities),
      }),
    },
  });

  await logAudit({
    action: "settings.update",
    entity: "settings",
    entityId: updated.id,
    metadata: {
      state: updated.slug,
      changedFields: {
        status: body.status !== undefined ? body.status : undefined,
        launchDate: body.launchDate !== undefined ? body.launchDate : undefined,
        tagline: body.tagline !== undefined ? body.tagline : undefined,
        heroImage: body.heroImage !== undefined ? body.heroImage : undefined,
        sortOrder: body.sortOrder !== undefined ? body.sortOrder : undefined,
        targetCities: body.targetCities !== undefined ? body.targetCities : undefined,
      },
    },
  });

  return NextResponse.json({
    state: {
      slug: updated.slug,
      name: updated.name,
      abbreviation: updated.abbreviation,
      tagline: updated.tagline,
      heroImage: updated.heroImage,
      status: updated.status,
      launchDate: updated.launchDate ? updated.launchDate.toISOString() : null,
      targetCities: (() => {
        try { return JSON.parse(updated.targetCities) as string[]; }
        catch { return []; }
      })(),
      sortOrder: updated.sortOrder,
    },
  });
}
