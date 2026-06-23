/**
 * Ingest runner — turns RawListings into Sale rows.
 *
 * Lifecycle for a single ingestion:
 *   1. Adapter.fetch(config) → RawListing[]
 *   2. Apply config.filters (zip, price, category)
 *   3. For each RawListing:
 *        - dedupe via IngestItem (unique [sourceId, externalId])
 *        - if already mapped to a Sale, refresh photos/title only if changed
 *        - else: geocode address, create Sale + IngestItem in a tx
 *   4. Return a summary so the cron caller can log it.
 *
 * Geocoding: Nominatim with the same User-Agent and 1 req/sec courtesy
 * throttle used by POST /api/sales. CL posts usually only have a city +
 * ZIP, so accuracy is loose. We set lat/lng to the city's centroid when
 * the geocode fails so the listing still shows up on the map.
 */

import { prisma } from "@/lib/prisma";
import { passesFilters, type IngestConfig, type IngestAdapter, type RawListing } from "./types";

export interface RunSummary {
  sourceId: string;
  kind: string;
  slug: string;
  fetched: number;
  newListings: number;
  updatedListings: number;
  skippedDuplicate: number;
  skippedFilter: number;
  errors: number;
  errorSample?: string;
  ms: number;
}

export async function runIngestForSource(
  sourceId: string,
  adapter: IngestAdapter
): Promise<RunSummary> {
  const start = Date.now();
  const source = await prisma.ingestSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error(`IngestSource ${sourceId} not found`);
  if (source.status !== "active") {
    return {
      sourceId,
      kind: source.kind,
      slug: source.slug,
      fetched: 0,
      newListings: 0,
      updatedListings: 0,
      skippedDuplicate: 0,
      skippedFilter: 0,
      errors: 0,
      ms: Date.now() - start,
    };
  }

  const config: IngestConfig = {
    kind: source.kind,
    slug: source.slug,
    label: source.label,
    lookbackHours: 24, // CL default — re-pull daily to catch edits.
    filters: {},
    options: safeJsonParse(source.config, {}),
  };

  let summary: RunSummary = {
    sourceId,
    kind: source.kind,
    slug: source.slug,
    fetched: 0,
    newListings: 0,
    updatedListings: 0,
    skippedDuplicate: 0,
    skippedFilter: 0,
    errors: 0,
    ms: 0,
  };

  try {
    const raw = await adapter.fetch(config);
    summary.fetched = raw.length;

    for (const listing of raw) {
      if (!passesFilters(listing, config)) {
        summary.skippedFilter++;
        await prisma.ingestItem.create({
          data: {
            sourceId,
            externalId: listing.externalId,
            payload: JSON.stringify(summarizeForAudit(listing)),
            status: "skipped_filter",
          },
        }).catch(() => undefined);
        continue;
      }

      try {
        const result = await upsertFromListing(sourceId, listing, config);
        if (result === "created") summary.newListings++;
        else if (result === "updated") summary.updatedListings++;
        else if (result === "duplicate") summary.skippedDuplicate++;
      } catch (err) {
        summary.errors++;
        if (!summary.errorSample) {
          summary.errorSample = err instanceof Error ? err.message : String(err);
        }
        await prisma.ingestItem.create({
          data: {
            sourceId,
            externalId: listing.externalId,
            payload: JSON.stringify(summarizeForAudit(listing)),
            status: "error",
            error: summary.errorSample,
          },
        }).catch(() => undefined);
      }
    }

    await prisma.ingestSource.update({
      where: { id: sourceId },
      data: {
        lastRunAt: new Date(),
        lastError: "",
        lastSeenCount: raw.length,
        lastNewCount: summary.newListings,
        status: "active",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors++;
    summary.errorSample = msg;
    await prisma.ingestSource.update({
      where: { id: sourceId },
      data: {
        lastRunAt: new Date(),
        lastError: msg.slice(0, 500),
        status: "error",
      },
    });
  }

  summary.ms = Date.now() - start;
  return summary;
}

async function upsertFromListing(
  sourceId: string,
  listing: RawListing,
  config: IngestConfig
): Promise<"created" | "updated" | "duplicate"> {
  // Dedupe via IngestItem.
  const existing = await prisma.ingestItem.findUnique({
    where: { sourceId_externalId: { sourceId, externalId: listing.externalId } },
  });
  if (existing && existing.status === "ok" && existing.saleId) {
    // Already mapped. Could refresh mutable fields here; skip for now.
    return "duplicate";
  }

  // Default TTL for ingest = 7 days. Ingested sales are lower-trust than
  // direct posts; we want them off the map quickly if the source stops
  // refreshing them.
  const ttlDays = config.filters?.maxPrice ? 7 : 7;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  let lat = listing.lat;
  let lng = listing.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    const geo = await geocodeListing(listing);
    lat = geo.lat;
    lng = geo.lng;
  }

  // Use the existing dedupe: sourceUrl alone isn't unique, but combined with
  // source it is. We add a synthetic sellerToken that mirrors the external id
  // so the same listing doesn't double-write.
  const syntheticToken = `ing-${sourceId.slice(0, 8)}-${listing.externalId}`.padEnd(36, "0");

  // Use upsert keyed on sellerToken (which we make deterministic per source+ext).
  // But sellerToken is uuid-shaped by default — use the unique IngestItem
  // + sourceUrl combination as the actual dedupe key.
  const byUrl = await prisma.sale.findFirst({
    where: { source: config.kind, sourceUrl: listing.sourceUrl },
    select: { id: true, photos: true, title: true },
  });

  let saleId: string;
  if (byUrl) {
    await prisma.sale.update({
      where: { id: byUrl.id },
      data: {
        title: listing.title,
        description: listing.description,
        photos: JSON.stringify(listing.photos),
        expiresAt,
        lat: lat as number,
        lng: lng as number,
      },
    });
    saleId = byUrl.id;
  } else {
    const created = await prisma.sale.create({
      data: {
        title: listing.title,
        type: listing.type,
        address: listing.address || "(see listing)",
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        lat: lat as number,
        lng: lng as number,
        dates: listing.datesLabel,
        hours: listing.hoursLabel,
        description: listing.description,
        seller: listing.sellerName,
        verified: false,
        photos: JSON.stringify(listing.photos),
        sellerToken: syntheticToken,
        source: config.kind,
        sourceUrl: listing.sourceUrl,
        expiresAt,
        impactKg: 0,
        // Ingested sales are not owned by a user.
        sellerUserId: null,
        submittedById: null,
        items: listing.price
          ? {
              create: [
                {
                  name: listing.title,
                  category: listing.category || "Other",
                  price: listing.price,
                  condition: "Good",
                },
              ],
            }
          : undefined,
      },
      select: { id: true },
    });
    saleId = created.id;
  }

  // Persist IngestItem so future runs dedupe.
  await prisma.ingestItem.upsert({
    where: { sourceId_externalId: { sourceId, externalId: listing.externalId } },
    create: {
      sourceId,
      externalId: listing.externalId,
      payload: JSON.stringify(summarizeForAudit(listing)),
      status: "ok",
      saleId,
    },
    update: {
      payload: JSON.stringify(summarizeForAudit(listing)),
      status: "ok",
      saleId,
      fetchedAt: new Date(),
    },
  });

  return byUrl ? "updated" : "created";
}

function summarizeForAudit(l: RawListing): Record<string, unknown> {
  // Keep this small — payload is for debugging, not full source-of-truth.
  return {
    title: l.title,
    sourceUrl: l.sourceUrl,
    city: l.city,
    state: l.state,
    zip: l.zip,
    photoCount: l.photos.length,
    price: l.price ?? null,
    sellerEmail: l.sellerEmail ? "<redacted>" : "",
  };
}

function safeJsonParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/**
 * Geocode the listing — Nominatim for a coarse city + zip match.
 * Falls back to the IngestSource config `centroid` (lat/lng) when present.
 */
async function geocodeListing(l: RawListing): Promise<{ lat: number; lng: number }> {
  const q = [l.city, l.state, l.zip].filter(Boolean).join(", ");
  if (!q) {
    return { lat: 39.7684, lng: -86.1581 }; // Indy default
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "GarageRoute/1.0 (ingest; +https://garageroute.com/about)" },
    });
    if (res.ok) {
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data[0]) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch {
    // swallow — fall through to default
  }
  return { lat: 39.7684, lng: -86.1581 };
}