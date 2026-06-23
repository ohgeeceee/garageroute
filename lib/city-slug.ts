/**
 * City slug parsing + formatting for `/sales/city/[slug]` routes.
 *
 * Slug format: "<city>-<state-abbrev>"
 *   - city is lowercased, spaces become dashes (e.g. "Indianapolis" -> "indianapolis")
 *   - state is the 2-letter USPS abbreviation (e.g. "IN")
 *   - suffix is "-<state-abbrev>"
 *
 * Examples:
 *   "indianapolis-in"   -> { city: "Indianapolis", state: "IN" }
 *   "san-antonio-tx"    -> { city: "San Antonio", state: "TX" }
 *   "new-york-ny"       -> { city: "New York", state: "NY" }
 *   "nyc-ny"            -> { city: "Nyc", state: "NY" }   (preserved as-is)
 */

const SUFFIX_RE = /-([a-z]{2})$/;

/** Parse a slug like "indianapolis-in" into its parts. Returns null if the suffix isn't a 2-letter code. */
export function parseCitySlug(
  slug: string
): { city: string; state: string } | null {
  const m = slug.toLowerCase().match(SUFFIX_RE);
  if (!m) return null;
  const state = m[1].toUpperCase();
  const citySlug = slug.slice(0, -(m[1].length + 1)); // strip "-xx"
  if (!citySlug) return null;
  const city = titleCaseCity(citySlug);
  return { city, state };
}

/** Build a slug from a sale's city + state. */
export function buildCitySlug(city: string, state: string): string {
  return `${slugifyCity(city)}-${state.toLowerCase()}`;
}

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Convert "san-antonio" -> "San Antonio". */
function titleCaseCity(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Validate that a 2-letter string is plausibly a US state abbreviation. */
export function isLikelyStateAbbrev(s: string): boolean {
  return /^[A-Z]{2}$/.test(s);
}