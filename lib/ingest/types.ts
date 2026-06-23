/**
 * Ingest layer — normalizes external listing sources into GarageRoute Sales.
 *
 * Why this exists:
 *   Tier 2 of the product roadmap pulls inventory from public, permissive
 *   sources (Craigslist RSS, estate-sale companies, municipal calendars)
 *   and Tier 3 from an opt-in user-mediated Chrome extension. Both need the
 *   same shape of "fetch → map → upsert → audit" loop.
 *
 * The contract below is intentionally narrow: an adapter is a pure function
 * from a config blob to a list of RawListing objects. Persistence + dedupe +
 *   scheduling live in `runner.ts` so adapters stay testable and swap-in-able.
 *
 * Compliance note:
 *   Each adapter's README at the top of its file must reference the source's
 *   terms-of-service. Adapters that violate ToS (e.g. logging into a site)
 *   do not belong in this layer.
 */

/**
 * A single external listing as the rest of the system sees it.
 *
 * Adapters produce these. The runner turns them into Sale rows.
 */
export interface RawListing {
  /** Stable external id from the source (Craigslist post id, ESNET id, etc). */
  externalId: string;
  /** Human title — what the seller wrote. */
  title: string;
  /** Free-form description, may contain HTML the runner will strip. */
  description: string;
  /** "Garage/Yard Sale" | "Moving Sale" | "Estate Sale" | "Multi-family" | "Neighborhood" */
  type: string;
  /** ISO 8601 strings — the runner parses these. */
  startAt?: string;
  endAt?: string;
  /** Free-form date+time string for the existing `dates` / `hours` fields. */
  datesLabel: string;
  hoursLabel: string;
  /** Geocodable street address. */
  address: string;
  city: string;
  state: string;
  zip: string;
  /** Optional pre-resolved coordinates. If absent, runner geocodes. */
  lat?: number;
  lng?: number;
  /** Image URLs (already public CDN). */
  photos: string[];
  /** Seller display name as it appears on the source. */
  sellerName: string;
  /** Seller email if exposed by the source — used for our confirmation email. */
  sellerEmail?: string;
  /** URL to the original listing (for attribution + report handling). */
  sourceUrl: string;
  /** Original posting price if applicable. */
  price?: number;
  /** Category guess for the Item rows (we create a single Item per listing). */
  category?: string;
}

export interface IngestConfig {
  /** "craigslist" | "estatesales" | "municipal" | "newspaper" | "extension" | "facebook_marketplace" */
  kind: string;
  /** Unique slug within a kind (e.g. "indianapolis" for craigslist). */
  slug: string;
  /** Human label for admin UI. */
  label: string;
  /** How far back to look, in hours. Adapter-specific. */
  lookbackHours: number;
  /** Per-source filters: zip allowlist, category allowlist, max price, etc. */
  filters?: {
    zipAllowlist?: string[];
    categoryAllowlist?: string[];
    maxPrice?: number;
    query?: string;
  };
  /** Adapter-specific knobs (subdomain, region, etc). */
  options?: Record<string, unknown>;
}

/**
 * An adapter turns a config into a list of RawListings. Adapters are pure
 * functions — no DB access, no side effects. The runner handles persistence.
 */
export interface IngestAdapter {
  readonly kind: string;
  /** Display label for the adapter. */
  readonly label: string;
  /** Fetch + parse listings. Should be idempotent within `config.lookbackHours`. */
  fetch(config: IngestConfig): Promise<RawListing[]>;
}

const ADAPTERS = new Map<string, IngestAdapter>();

export function registerAdapter(adapter: IngestAdapter): void {
  ADAPTERS.set(adapter.kind, adapter);
}

export function getAdapter(kind: string): IngestAdapter | null {
  return ADAPTERS.get(kind) ?? null;
}

export function listAdapterKinds(): string[] {
  return Array.from(ADAPTERS.keys());
}

/**
 * Map a source's category string to one of our canonical Sale.type values.
 * Falls back to "Garage/Yard Sale" since that is by far the most common.
 */
export function mapType(input: string | undefined): string {
  if (!input) return "Garage/Yard Sale";
  const s = input.toLowerCase();
  if (s.includes("estate")) return "Estate Sale";
  if (s.includes("moving")) return "Moving Sale";
  if (s.includes("multi")) return "Multi-family";
  if (s.includes("neighborhood")) return "Neighborhood";
  return "Garage/Yard Sale";
}

/**
 * Strip HTML and normalize whitespace. Cheap & dirty — good enough for
 * descriptions that we display in cards. Use a real sanitizer before
 * rendering unescaped HTML.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Apply per-source filters from the config. */
export function passesFilters(listing: RawListing, config: IngestConfig): boolean {
  const f = config.filters;
  if (!f) return true;
  if (f.zipAllowlist && f.zipAllowlist.length > 0 && !f.zipAllowlist.includes(listing.zip)) {
    return false;
  }
  if (typeof f.maxPrice === "number" && listing.price && listing.price > f.maxPrice) {
    return false;
  }
  if (
    f.categoryAllowlist &&
    f.categoryAllowlist.length > 0 &&
    listing.category &&
    !f.categoryAllowlist.some((c) => c.toLowerCase() === listing.category?.toLowerCase())
  ) {
    return false;
  }
  return true;
}