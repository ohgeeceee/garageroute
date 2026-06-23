/**
 * POST /api/extension/ingest
 *
 * Receives batched items from the GarageRoute Bridge Chrome extension.
 * Auth: Bearer token issued by /api/extension/token.
 *
 * Body:
 *   { items: Array<{
 *       sourceUrl: string,
 *       title: string,
 *       photo?: string,
 *       price?: number,
 *       city?: string,
 *       state?: string,
 *       zip?: string,
 *       scrapedAt?: string,
 *     }> }
 *
 * Each item is treated as a draft — created in the user's account with
 * status="ended" by default (seller must confirm before it goes public).
 * Actually: status="active", source="extension", sourceUrl=<fb url>.
 * The seller can edit/remove from their /account/sales view.
 *
 * Compliance: this endpoint never calls facebook.com. The extension reads
 * the DOM while the user is logged in; we receive the parsed payload.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH = 50;
const TOKEN_TTL_BUFFER_MS = 5 * 60 * 1000; // tolerate 5min clock skew

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+([a-f0-9]{64})$/i);
  if (!m) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const tokenHash = sha256(m[1]);

  const token = await prisma.extensionToken.findUnique({ where: { tokenHash } });
  if (!token || token.revokedAt) {
    return NextResponse.json({ error: "Token revoked" }, { status: 401 });
  }
  if (token.expiresAt.getTime() + TOKEN_TTL_BUFFER_MS < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  let body: { items?: Array<Record<string, unknown>> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = Array.isArray(body.items) ? body.items.slice(0, MAX_BATCH) : [];

  // Find or create the IngestSource for this user's extension.
  // Each user gets their own source so dedupe + audit stay clean.
  let source = await prisma.ingestSource.findUnique({
    where: { kind_slug: { kind: "extension", slug: token.id.slice(0, 12) } },
  });
  if (!source) {
    source = await prisma.ingestSource.create({
      data: {
        kind: "extension",
        slug: token.id.slice(0, 12),
        label: `Extension — ${token.label || "device"}`,
        baseUrl: "chrome-extension",
        status: "active",
      },
    });
  }

  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const item of raw) {
    try {
      const sourceUrl = String(item.sourceUrl || "").slice(0, 1000);
      const title = String(item.title || "").trim().slice(0, 200);
      if (!sourceUrl || !title) {
        skippedCount++;
        continue;
      }
      const externalId = extractFbId(sourceUrl) || sourceUrl.slice(-12);

      const existing = await prisma.ingestItem.findUnique({
        where: { sourceId_externalId: { sourceId: source.id, externalId } },
      });
      if (existing && existing.status === "ok" && existing.saleId) {
        skippedCount++;
        continue;
      }

      const photo = typeof item.photo === "string" ? item.photo.slice(0, 1000) : "";
      const price = typeof item.price === "number" ? item.price : null;
      const city = typeof item.city === "string" ? item.city.slice(0, 80) : token.scopeCity;
      const state = typeof item.state === "string" ? item.state.slice(0, 8) : token.scopeState;
      const zip = typeof item.zip === "string" ? item.zip.slice(0, 10) : token.scopeZip;

      // Geocoding skipped here — extension provides zip/city; if absent, fall
      // back to the token's scope. lat/lng will be missing until admin geocodes.
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const byUrl = await prisma.sale.findFirst({
        where: { source: "extension", sourceUrl },
        select: { id: true },
      });

      let saleId: string;
      if (byUrl) {
        await prisma.sale.update({
          where: { id: byUrl.id },
          data: {
            title,
            photos: JSON.stringify(photo ? [photo] : []),
            city,
            state,
            zip,
            expiresAt,
          },
        });
        saleId = byUrl.id;
        updatedCount++;
      } else {
        const created = await prisma.sale.create({
          data: {
            title,
            type: "Garage/Yard Sale",
            address: "(see listing)",
            city,
            state,
            zip,
            lat: 0, // admin can geocode later
            lng: 0,
            dates: "See listing",
            hours: "See listing",
            description: "Imported from Facebook Marketplace via the GarageRoute Bridge extension. Confirm details before sharing.",
            seller: userLabel(token),
            verified: false,
            photos: JSON.stringify(photo ? [photo] : []),
            sellerToken: `ext-${token.id.slice(0, 8)}-${externalId}`.padEnd(36, "0"),
            source: "extension",
            sourceUrl,
            expiresAt,
            impactKg: 0,
            sellerUserId: token.userId,
            submittedById: token.userId,
            items: price
              ? {
                  create: [
                    {
                      name: title,
                      category: "Other",
                      price,
                      condition: "Good",
                    },
                  ],
                }
              : undefined,
          },
          select: { id: true },
        });
        saleId = created.id;
        newCount++;
      }

      await prisma.ingestItem.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId } },
        create: {
          sourceId: source.id,
          externalId,
          payload: JSON.stringify({ title, photo: photo ? "[redacted]" : "", price }),
          status: "ok",
          saleId,
        },
        update: {
          status: "ok",
          saleId,
          fetchedAt: new Date(),
        },
      });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  await prisma.ingestSource.update({
    where: { id: source.id },
    data: {
      lastRunAt: new Date(),
      lastSeenCount: raw.length,
      lastNewCount: newCount,
      lastError: errors.length ? errors[0].slice(0, 500) : "",
    },
  });
  await prisma.extensionToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    received: raw.length,
    newCount,
    updatedCount,
    skippedCount,
    errorCount: errors.length,
    errorSample: errors[0],
  });
}

function extractFbId(url: string): string | null {
  const m = url.match(/\/marketplace\/item\/(\d+)/);
  return m ? m[1] : null;
}

function userLabel(token: { label: string; userId: string }): string {
  if (token.label) return `Extension — ${token.label}`;
  return `Extension user ${token.userId.slice(0, 8)}`;
}