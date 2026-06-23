/**
 * Blog post loader.
 *
 * Reads markdown files from /content/blog/*.md, parses frontmatter,
 * renders markdown to HTML once at build time, and exposes typed
 * accessors for the list and detail pages.
 *
 * Files are cached in module scope so multiple page renders in the
 * same build don't re-parse. For live re-renders during dev, Next.js
 * will reload on file change automatically.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkGfm from "remark-gfm";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  coverImage: string;
  html: string;
  /** Reading time in minutes, computed from word count. */
  readingMinutes: number;
};

let cache: BlogPost[] | null = null;

function readAllPosts(): BlogPost[] {
  if (cache) return cache;

  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"));

  const posts: BlogPost[] = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    const { data, content } = matter(raw);

    // Render markdown → HTML server-side.
    // remarkHtml produces an HTML string (no React tree) — we render it
    // via dangerouslySetInnerHTML on the detail page.
    const html = (
      remark()
        .use(remarkGfm) // tables, strikethrough, autolinks
        .use(remarkHtml, { sanitize: false })
        .processSync(content)
    ).toString();

    const words = content.split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.round(words / 220));

    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? "",
      publishedAt: data.publishedAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt,
      author: data.author ?? "GarageRoute Team",
      tags: Array.isArray(data.tags) ? data.tags : [],
      coverImage: data.coverImage ?? "",
      html,
      readingMinutes,
    };
  });

  // Newest first.
  posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  cache = posts;
  return posts;
}

export function getAllPosts(): BlogPost[] {
  return readAllPosts();
}

export function getPost(slug: string): BlogPost | null {
  return readAllPosts().find((p) => p.slug === slug) ?? null;
}

export function getAllSlugs(): string[] {
  return readAllPosts().map((p) => p.slug);
}

/** Slugify a title for stable URLs. Used by the editor when generating new posts. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}