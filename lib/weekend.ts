/**
 * Best-effort parser for the human-readable `Sale.dates` string (e.g.
 * "Sat, Jun 20 – Sun, Jun 21" or "Sat, Jul 4"). Returns the earliest matching
 * Date found, or null if nothing parseable. Defaults to `today`'s year; rolls
 * forward to next year for past dates.
 */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const WEEKDAY_RE = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*/i;
const DATE_RE = /\b([a-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{4}))?/i;

/**
 * Parses dates like "Sat, Jun 20" or "Sat, Jun 20, 2026". Returns a Date or null.
 */
function parseOne(s: string, now: Date): Date | null {
  const m = s.match(DATE_RE);
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  const day = parseInt(m[2], 10);
  if (Number.isNaN(day) || day < 1 || day > 31) return null;
  const year: number = m[3] ? parseInt(m[3], 10) : now.getFullYear();
  const candidate = new Date(year, month, day);
  // If the date already passed and no explicit year, roll to next year.
  if (!m[3] && candidate.getTime() < now.getTime() - 1000 * 60 * 60 * 24 * 7) {
    candidate.setFullYear(year + 1);
  }
  return candidate;
}

/**
 * Returns the earliest Date the sale occurs on. The dates string can list one
 * or more days (e.g. "Sat, Jun 20 – Sun, Jun 21").
 */
export function earliestSaleDate(datesStr: string): Date | null {
  if (!datesStr) return null;
  const now = new Date();
  const parsed = parseOne(datesStr, now);
  if (parsed) return parsed;

  // Fallback: try splitting on dashes/commas and parsing each segment.
  const parts = datesStr.split(/\s*[\u2013\u2014\-]\s*|\s*,\s*/);
  const found: Date[] = [];
  for (const p of parts) {
    const d = parseOne(p, now);
    if (d) found.push(d);
  }
  if (!found.length) return null;
  found.sort((a, b) => a.getTime() - b.getTime());
  return found[0];
}

/**
 * Returns the latest Date the sale occurs on (handles ranges). Falls back to
 * `earliestSaleDate` when the range can't be parsed.
 */
export function latestSaleDate(datesStr: string): Date | null {
  if (!datesStr) return null;
  const now = new Date();
  const parts = datesStr.split(/\s*[\u2013\u2014\-]\s*|\s*,\s*/);
  const found: Date[] = [];
  for (const p of parts) {
    const d = parseOne(p, now);
    if (d) found.push(d);
  }
  if (!found.length) return earliestSaleDate(datesStr);
  found.sort((a, b) => a.getTime() - b.getTime());
  return found[found.length - 1];
}

/**
 * Returns the next upcoming Friday at 00:00 (local). If today is Fri/Sat/Sun,
 * returns this Friday; otherwise returns the upcoming Friday.
 */
export function upcomingFriday(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = Sun, 5 = Fri
  const delta = (5 - dow + 7) % 7; // days until Friday
  d.setDate(d.getDate() + delta);
  return d;
}

/**
 * Returns the upcoming weekend window [Fri 00:00, Mon 00:00).
 */
export function upcomingWeekend(now: Date = new Date()): { start: Date; end: Date } {
  const start = upcomingFriday(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return { start, end };
}

/**
 * "Next 7 days" window: today through today+7.
 */
export function nextNDays(n: number, now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + n);
  return { start, end };
}

export type TimeWindow = "weekend" | "7d" | "all";

/**
 * Returns true if the sale falls in the requested time window.
 * - "weekend": any date in the upcoming Fri-Mon window
 * - "7d": any date in the next 7 days
 * - "all": always true
 *
 * If parsing fails, the sale is included (lenient — we never hide things
 * because we couldn't understand the date string).
 */
export function isInTimeWindow(datesStr: string, window: TimeWindow, now: Date = new Date()): boolean {
  if (window === "all") return true;
  const start = earliestSaleDate(datesStr);
  const end = latestSaleDate(datesStr);
  if (!start || !end) return true; // lenient default

  const range = window === "weekend" ? upcomingWeekend(now) : nextNDays(7, now);
  // Sale overlaps the window if it ends after the window starts AND starts
  // before the window ends.
  return end.getTime() >= range.start.getTime() && start.getTime() < range.end.getTime();
}

/**
 * Cheap weekday extraction from the dates string. Returns an array of weekday
 * numbers (0 = Sun, 6 = Sat). Best-effort — used as a tie-breaker when dates
 * can't be fully parsed.
 */
export function mentionedWeekdays(datesStr: string): number[] {
  if (!datesStr) return [];
  const out = new Set<number>();
  const map: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  const re = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(datesStr)) !== null) {
    const n = map[m[1].toLowerCase()];
    if (n !== undefined) out.add(n);
  }
  return Array.from(out);
}

export { WEEKDAY_RE };