/**
 * Craigslist RSS adapter.
 *
 * Compliance:
 *   Craigslist publishes RSS feeds for personal/non-commercial use. See
 *   https://www.craigslist.org/about/rss. We hit the public feed, identify
 *   ourselves with a clear User-Agent, and respect robots.txt by limiting
 *   to one request per IngestSource per cron tick.
 *
 *   We do NOT log in, do NOT use residential proxies, and do NOT bypass any
 *   rate limits. If Craigslist changes their ToS, this adapter gets disabled
 *   by flipping IngestSource.status to "paused".
 *
 * URL shape:
 *   https://<subdomain>.craigslist.org/search/<cat>?format=rss&query=<q>&hasPic=1
 *   <subdomain> is the city slug — e.g. "indianapolis", "sfbay", "newyork".
 *
 * RSS shape (predictable enough to parse with regex; no XML lib needed):
 *   <item>
 *     <title>Garage Sale Saturday — Foo</title>
 *     <link>https://...craigslist.org/.../1234567890.html</link>
 *     <description><![CDATA[ ... ]]></description>
 *     <dc:creator>Jane D.</dc:creator>     (sometimes missing)
 *     <enclosure url="..." type="image/jpeg" /> (sometimes present)
 *     <pubDate>Sat, 22 Jun 2026 12:34:56 GMT</pubDate>
 *   </item>
 *
 * Craigslist does NOT expose lat/lng in the RSS. Geocoding happens later in
 * the runner (Nominatim). Accuracy is fine for "city + zip" granularity.
 */

import type { IngestAdapter, IngestConfig, RawListing } from "./types";

interface CraigslistOpts {
  /** City subdomain, e.g. "indianapolis". Falls back to config.slug. */
  subdomain?: string;
  /** Search category code. "sss" = all for sale. Default: "sss". */
  category?: string;
  /** Search query. Default: "garage sale". */
  query?: string;
  /** Max items to return. CL caps at ~100 per RSS request anyway. Default: 50. */
  maxItems?: number;
}

const DEFAULT_UA = "GarageRouteBot/1.0 (+https://garageroute.com/about) RSS-reader";

export class CraigslistAdapter implements IngestAdapter {
  readonly kind = "craigslist";
  readonly label = "Craigslist";

  async fetch(config: IngestConfig): Promise<RawListing[]> {
    const opts = (config.options as CraigslistOpts) ?? {};
    const subdomain = (opts.subdomain ?? config.slug ?? "").toLowerCase();
    if (!subdomain) {
      throw new Error(`Craigslist adapter: missing subdomain in config.options for slug=${config.slug}`);
    }
    const category = opts.category ?? "sss";
    const query = opts.query ?? "garage sale";
    const maxItems = Math.min(opts.maxItems ?? 50, 100);

    const url = new URL(`https://${subdomain}.craigslist.org/search/${category}`);
    url.searchParams.set("format", "rss");
    url.searchParams.set("query", query);
    url.searchParams.set("hasPic", "1");
    url.searchParams.set("sort", "date");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
      // CL can be slow at peak times.
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new Error(`Craigslist HTTP ${res.status} for ${url.host}`);
    }
    const xml = await res.text();

    const cutoff = Date.now() - config.lookbackHours * 60 * 60 * 1000;
    const items = extractItems(xml).slice(0, maxItems);

    const out: RawListing[] = [];
    for (const item of items) {
      const pubAt = parseRfc822(item.pubDate);
      // Skip items older than the lookback window — they're either already
      // ingested or not worth surfacing.
      if (pubAt && pubAt.getTime() < cutoff) continue;

      const externalId = extractExternalId(item.link);
      if (!externalId) continue;

      const cleaned = decodeEntities(item.title).trim();
      if (!looksLikeYardSale(cleaned, item.description)) continue;

      // Pull image URLs out of the description (CL embeds them in <img>).
      const photos = extractImageUrls(item.description).slice(0, 6);

      out.push({
        externalId,
        title: cleaned,
        description: stripHtml(item.description).slice(0, 1500),
        type: "Garage/Yard Sale",
        datesLabel: formatDatesLabel(pubAt),
        hoursLabel: "See listing",
        address: "(see listing)",
        city: prettifyCity(subdomain),
        state: guessState(subdomain),
        zip: "",
        photos,
        sellerName: decodeEntities(item.creator || "Anonymous").trim() || "Anonymous",
        sourceUrl: item.link,
      });
    }
    return out;
  }
}

function extractItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  creator: string;
  pubDate: string;
}> {
  const items: ReturnType<typeof extractItems> = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      title: tag(block, "title") ?? "",
      link: tag(block, "link") ?? "",
      description: cdataOrTag(block, "description") ?? "",
      creator: tag(block, "dc:creator") ?? tag(block, "creator") ?? "",
      pubDate: tag(block, "pubDate") ?? "",
    });
  }
  return items;
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = block.match(re);
  return m ? m[1] : null;
}

function cdataOrTag(block: string, name: string): string | null {
  const cdata = new RegExp(`<${name}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${name}>`, "i");
  const m = block.match(cdata);
  if (m) return m[1];
  return tag(block, name);
}

/**
 * CL post URLs look like https://<sub>.craigslist.org/<area>/<cat>/<id>.html
 * The trailing number is the stable external id.
 */
function extractExternalId(link: string): string | null {
  const m = link.match(/\/(\d{8,12})\.html/);
  return m ? m[1] : null;
}

function extractImageUrls(description: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(description)) !== null) {
    const u = m[1].trim();
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  // CL thumbnails often use https://images.craigslist.org/..._300x300.jpg
  // The "full" image is the same URL without the _NNNxNNN suffix.
  return out.map((u) => u.replace(/_300x300\.(jpg|jpeg|png)$/i, ".$1"));
}

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};
function decodeEntities(s: string): string {
  return s.replace(/&[a-z#0-9]+;/gi, (m) => ENTITY_MAP[m] ?? m);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Very loose filter — only ingest posts that look like a garage/yard/moving/estate sale.
 * CL's "garage sale" search is noisy (tools, vintage furniture, etc), so this matters.
 */
function looksLikeYardSale(title: string, description: string): boolean {
  const blob = `${title} ${stripHtml(description)}`.toLowerCase();
  const keywords = [
    "garage sale", "yard sale", "moving sale", "estate sale",
    "multi family", "multi-family", "neighborhood sale",
    "block sale", "porch sale",
  ];
  return keywords.some((k) => blob.includes(k));
}

function parseRfc822(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDatesLabel(d: Date | null): string {
  if (!d) return "See listing";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Best-effort city prettifier. CL subdomains are mostly lowercase city names.
 * This is purely cosmetic — the real label is in IngestSource.label.
 */
function prettifyCity(subdomain: string): string {
  return subdomain
    .replace(/[^a-z]+/gi, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * CL subdomains don't always map to a state. We don't try to be clever here —
 * the admin sets IngestSource.label with the real city + state. We expose this
 * for cases where a state-level aggregator is configured (rare).
 */
function guessState(subdomain: string): string {
  // A handful of well-known multi-city subdomains — see craigslist.org/sites/.
  const known: Record<string, string> = {
    sfbay: "CA",
    newyork: "NY",
    losangeles: "CA",
    chicagoreads: "IL",
    seattle: "WA",
    boston: "MA",
    washingtondc: "DC",
  };
  return known[subdomain] ?? "";
}