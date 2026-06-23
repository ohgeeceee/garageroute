import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft, BookOpen, User } from "lucide-react";
import { getAllSlugs, getAllPosts, getPost } from "@/lib/blog";
import {
  articleJsonLd,
  breadcrumbJsonLd,
} from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

// Pre-build all known blog posts at build time. New posts go live on
// next deploy (or via ISR revalidate).
export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { robots: { index: false, follow: true } };

  const canonical = `https://garageroute.com/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: canonical,
      siteName: "GarageRoute",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
      ...(post.coverImage ? { images: [{ url: post.coverImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Related posts: same tags first, then most recent fallback.
  const all = getAllPosts();
  const related = all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      post: p,
      score: p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, 3)
    .map((x) => x.post);

  return (
    <article className="bg-surface-50">
      {/* Article + Breadcrumb schema */}
      <Script
        id={`article-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }}
      />
      <Script
        id={`post-breadcrumb-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: "https://garageroute.com" },
              { name: "Blog", url: "https://garageroute.com/blog" },
              { name: post.title, url: `https://garageroute.com/blog/${post.slug}` },
            ])
          ),
        }}
      />

      {/* Hero */}
      <header className="bg-surface-900 text-surface-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Link
            href="/blog"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200"
          >
            <ArrowLeft className="h-4 w-4" />
            All posts
          </Link>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            <BookOpen className="h-3.5 w-3.5" />
            GarageRoute Blog
          </div>

          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-surface-300">
            {post.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-400">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readingMinutes} min read
            </span>
          </div>
        </div>

        {post.coverImage && (
          <div className="mx-auto -mb-1 max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-t-2xl bg-surface-100">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div
          className="prose prose-surface max-w-none text-surface-800"
          // The HTML is produced server-side from our trusted markdown
          // pipeline. We allow it because the markdown files ship with
          // the repo and are reviewed before deploy.
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-surface-200 pt-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-surface-200 bg-surface-0 px-3 py-1 text-xs font-medium text-surface-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-surface-200 bg-surface-0 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold tracking-tight text-surface-900">
              Keep reading
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="card flex flex-col p-5 transition hover:shadow-md"
                >
                  <h3 className="text-base font-bold text-surface-900">
                    {r.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-surface-600">
                    {r.description}
                  </p>
                  <span className="mt-3 text-xs font-semibold text-brand-700">
                    {r.readingMinutes} min read →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}