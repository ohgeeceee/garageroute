/**
 * Schema.org structured data (JSON-LD) generators for GarageRoute.
 *
 * These power:
 *  - Rich results in Google Search (Event, Organization, etc.)
 *  - Citation by LLMs (ChatGPT, Claude, Perplexity) when they scrape
 *    our pages — clean structured data is what they prefer to lift.
 *
 * Conventions:
 *  - Always emit `@context: "https://schema.org"`.
 *  - Use absolute URLs (`https://garageroute.com/...`) so the JSON-LD
 *    is portable when copied by aggregators.
 *  - Keep functions pure + serializable — they run on the server.
 */

import type { Sale } from "@/data/sales";
import type { BlogPost } from "@/lib/blog";

const SITE_URL = "https://garageroute.com";
const SITE_NAME = "GarageRoute";
const SITE_DESCRIPTION =
  "Discover local garage and estate sales, preview items, and build optimized weekend routes.";

function publicUrl(path = ""): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512x512.png`,
    description: SITE_DESCRIPTION,
    email: "admin@garageroute.com",
    foundingDate: "2025",
    sameAs: [
      // Add real social URLs as they're created. Empty arrays render
      // as no entries which is fine for crawlers.
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "admin@garageroute.com",
      areaServed: "US",
      availableLanguage: ["en"],
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/sales?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Schema.org Event for an individual garage/yard sale.
 *
 * Notes on field choices:
 *  - `eventAttendanceMode` = OfflineEventAttendanceMode (it's a physical sale).
 *  - `eventStatus` = EventScheduled (could be EventCancelled if seller flags it).
 *  - `startDate` / `endDate` are best-effort ISO; if the source data only has
 *    a freeform "dates" string (e.g. "Sat, Jun 20 – Sun, Jun 21") we attempt
 *    to parse the year from `dates` and fall back to a placeholder if not.
 *  - `location` uses PostalAddress + GeoCoordinates so map SERPs can use it.
 *  - `organizer` ties the event to the marketplace entity.
 */
export function saleJsonLd(sale: Sale) {
  const { startDate, endDate } = parseDateRange(sale.dates);
  const cover = sale.photos?.[0] ? toAbsoluteUrl(sale.photos[0]) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: sale.title,
    description: sale.description,
    startDate,
    endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: sale.title,
      address: {
        "@type": "PostalAddress",
        streetAddress: sale.address,
        addressLocality: sale.city,
        addressRegion: sale.state,
        postalCode: sale.zip,
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: sale.lat,
        longitude: sale.lng,
      },
    },
    ...(cover ? { image: [cover] } : {}),
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: sale.items
      .filter((i) => typeof i.price === "number")
      .slice(0, 20)
      .map((i) => ({
        "@type": "Offer",
        name: i.name,
        price: i.price!.toFixed(2),
        priceCurrency: "USD",
        availability: i.sold
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
        itemCondition: conditionToSchema(i.condition),
      })),
  };
}

/**
 * ItemList JSON-LD for the /sales browse page. Helps Google show a
 * list of events in some SERP layouts.
 */
export function saleListJsonLd(sales: Sale[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: sales.slice(0, 50).map((sale, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: publicUrl(`/sales/${sale.id}`),
      name: sale.title,
    })),
  };
}

/**
 * BreadcrumbList JSON-LD — emitted on nested pages (sale detail, blog
 * post, state page) so SERPs can show breadcrumb trails.
 */
export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

/**
 * Schema.org BlogPosting for an individual blog post.
 *
 * Fields chosen to maximize Google's rich-result eligibility:
 *  - headline, description, image for SERP snippet
 *  - datePublished + dateModified for freshness signal
 *  - author as Person (uses the article's author byline)
 *  - publisher as Organization (GarageRoute)
 *  - mainEntityOfPage + canonical URL
 */
export function articleJsonLd(post: BlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.coverImage ? [toAbsoluteUrl(post.coverImage)] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/icon-512x512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    keywords: post.tags.join(", "),
  };
}

// ---------- helpers ----------

function conditionToSchema(
  condition: "New" | "Like New" | "Good" | "Fair"
): string {
  // https://schema.org/OfferItemCondition
  switch (condition) {
    case "New":
      return "https://schema.org/NewCondition";
    case "Like New":
    case "Good":
      return "https://schema.org/UsedCondition";
    case "Fair":
      return "https://schema.org/RefurbishedCondition";
    default:
      return "https://schema.org/UsedCondition";
  }
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

/**
 * Best-effort parser for the freeform `dates` field on Sale.
 * Input examples:
 *   "Sat, Jun 20 – Sun, Jun 21"      -> { startDate: "2026-06-20", endDate: "2026-06-21" }
 *   "Saturday, June 20, 2026"        -> { startDate: "2026-06-20", endDate: "2026-06-20" }
 *   "Sat Jun 20"                     -> { startDate: "2026-06-20", endDate: "2026-06-20" }
 *   anything unparseable             -> { startDate: now(), endDate: now() }   (still valid Event markup)
 */
function parseDateRange(input: string): { startDate: string; endDate: string } {
  const fallback = (): { startDate: string; endDate: string } => {
    const today = new Date().toISOString().slice(0, 10);
    return { startDate: today, endDate: today };
  };

  if (!input) return fallback();

  // Split on en-dash, em-dash, or hyphen-with-spaces
  const parts = input.split(/\s+[\u2013\u2014\-]\s+/);
  const year = new Date().getFullYear();

  const startParsed = tryParseDate(parts[0], year);
  const endParsed = parts[1] ? tryParseDate(parts[1], year) : startParsed;

  if (!startParsed) return fallback();
  return { startDate: startParsed, endDate: endParsed || startParsed };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};

function tryParseDate(raw: string, year: number): string | null {
  // Strip weekday prefix if present: "Sat, Jun 20" -> "Jun 20"
  const cleaned = raw
    .replace(/^(sun|mon|tue|wed|thu|fri|sat)(day|day,)?,?\s*/i, "")
    .replace(/,/g, "")
    .trim();

  // "Jun 20" or "June 20"
  const m = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?$/);
  if (!m) return null;

  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = parseInt(m[2], 10);
  const y = m[3] ? parseInt(m[3], 10) : year;
  if (!day || day < 1 || day > 31) return null;

  return `${y.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}