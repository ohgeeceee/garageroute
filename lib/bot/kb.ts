import { readFile } from "node:fs/promises";
import path from "node:path";
import { BOT_NAME } from "./config";

/**
 * Lightweight in-memory KB index. Loads AGENTS.md + docs/faq.md on first call,
 * splits into chunks, and exposes a keyword-scored search.
 *
 * Trade-off vs embeddings: simpler, zero extra infra, fits a one-person
 * operation. For 50+ docs we'd swap in a vector store; for now this is fine.
 */

type Chunk = { source: string; heading: string; text: string };

let cache: { loadedAt: number; chunks: Chunk[] } | null = null;
const CACHE_TTL_MS = 60_000; // re-read every minute

const KB_FILES: { path: string; source: string }[] = [
  { path: "AGENTS.md", source: "AGENTS.md" },
  { path: "docs/faq.md", source: "FAQ" },
];

async function loadChunks(): Promise<Chunk[]> {
  const root = process.cwd();
  const all: Chunk[] = [];
  for (const file of KB_FILES) {
    try {
      const full = path.join(root, file.path);
      const raw = await readFile(full, "utf8");
      all.push(...splitIntoChunks(raw, file.source));
    } catch {
      // Missing file is OK — seed can lag behind code.
    }
  }
  return all;
}

/**
 * Split markdown by headings. Each chunk = heading + body until next heading
 * of equal-or-higher level.
 */
function splitIntoChunks(md: string, source: string): Chunk[] {
  const lines = md.split("\n");
  const chunks: Chunk[] = [];
  let currentHeading = "(intro)";
  let currentBody: string[] = [];

  function flush() {
    const text = currentBody.join("\n").trim();
    if (text.length > 0) {
      chunks.push({ source, heading: currentHeading, text });
    }
  }

  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (h) {
      flush();
      currentHeading = h[2].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  flush();

  // Trim chunks > 1500 chars by splitting on blank lines.
  return chunks.flatMap((c) => {
    if (c.text.length <= 1500) return [c];
    const subs = c.text.split(/\n\s*\n/).reduce<string[][]>((acc, p) => {
      const last = acc[acc.length - 1] ?? [];
      const joined = [...last, p].join("\n\n");
      if (joined.length > 1500) {
        acc.push([p]);
      } else {
        last.push(p);
      }
      return acc;
    }, [[]] as string[][]);
    return subs
      .filter((s: string[]) => s.join("\n\n").trim().length > 0)
      .map((s: string[]) => ({ source: c.source, heading: c.heading, text: s.join("\n\n") }));
  });
}

export async function getKbChunks(): Promise<Chunk[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.chunks;
  const chunks = await loadChunks();
  cache = { loadedAt: Date.now(), chunks };
  return chunks;
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","is","are","was","were","be","been","being",
  "i","you","he","she","we","they","them","their","my","your","our","its",
  "to","of","in","on","at","by","for","with","about","as","into","from",
  "this","that","these","those","it","what","how","when","where","why","who",
  "do","does","did","can","could","should","would","will","may","might",
  "have","has","had","there","here","any","all","some","no","not","so",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export type SearchHit = { source: string; heading: string; text: string; score: number };

/**
 * Score chunks by overlap with query tokens, then return top N.
 *
 * Bonus scoring: heading matches beat body matches (3x), source matches
 * against FAQ source get a small boost.
 */
export async function searchKb(query: string, topN = 4): Promise<SearchHit[]> {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const chunks = await getKbChunks();

  const scored = chunks.map((c) => {
    const cTokens = tokenize(c.text + " " + c.heading);
    const cSet = new Set(cTokens);
    let score = 0;
    for (const t of qTokens) {
      if (cSet.has(t)) score += 1;
    }
    if (c.heading && tokenize(c.heading).some((t) => qTokens.includes(t))) {
      score *= 3;
    }
    if (c.source === "FAQ") score *= 1.2;
    return { source: c.source, heading: c.heading, text: c.text, score };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/** Format hits for the LLM. */
export function formatKbHits(hits: SearchHit[]): string {
  if (hits.length === 0) {
    return "(No relevant knowledge base entries found.)";
  }
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] ${h.source} — ${h.heading}\n${h.text.slice(0, 1200)}${h.text.length > 1200 ? "…" : ""}`
    )
    .join("\n\n---\n\n");
}

/** Quick snippet the widget can show alongside a KB-backed answer. */
export function kbSnippet(hits: SearchHit[]): string {
  if (!hits[0]) return "";
  const top = hits[0];
  const firstPara = top.text.split(/\n\s*\n/)[0].slice(0, 220);
  return firstPara;
}

/** Build a short system prefix so the LLM knows who it is. */
export function botSelfDescription(): string {
  return `You are ${BOT_NAME}, the AI assistant for GarageRoute.com — a marketplace for discovering local garage/yard sales, previewing items, and building optimized weekend driving routes.`;
}