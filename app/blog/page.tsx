import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { getAllPosts } from "@/lib/blog";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "GarageRoute Blog — Tips for buyers and sellers",
  description:
    "Practical guides for finding garage sales, planning your route, pricing your items, and getting more buyers to your driveway. Written by the GarageRoute team.",
  alternates: {
    canonical: "https://garageroute.com/blog",
  },
  openGraph: {
    title: "GarageRoute Blog — Tips for buyers and sellers",
    description:
      "Practical guides for finding garage sales, planning your route, pricing your items, and getting more buyers to your driveway.",
    type: "website",
    url: "https://garageroute.com/blog",
    siteName: "GarageRoute",
  },
  twitter: {
    card: "summary_large_image",
    title: "GarageRoute Blog",
    description:
      "Practical guides for finding garage sales, planning your route, pricing your items, and getting more buyers to your driveway.",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="bg-surface-50">
      <Script
        id="blog-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: "https://garageroute.com" },
              { name: "Blog", url: "https://garageroute.com/blog" },
            ])
          ),
        }}
      />

      <section className="relative overflow-hidden bg-surface-900 text-surface-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.30),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_45%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-surface-400">
            <Link href="/" className="hover:text-surface-200">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-surface-200">Blog</span>
          </nav>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            <BookOpen className="h-4 w-4" />
            GarageRoute Blog
          </div>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Tips for{" "}
            <span className="bg-gradient-to-r from-brand-300 to-info-300 bg-clip-text text-transparent">
              buyers and sellers
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-surface-300">
            Practical guides for finding the best sales, planning your Saturday
            route, and getting more buyers to your driveway. Written by people
            who actually go to (and run) garage sales.
          </p>
        </div>
      </section>

      <section className="bg-surface-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <p className="text-center text-surface-500">
              No posts yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="card group flex flex-col overflow-hidden p-0 transition hover:shadow-lg"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex h-full flex-col"
                  >
                    {post.coverImage && (
                      <div className="relative aspect-[1200/630] w-full overflow-hidden bg-surface-100">
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-3 flex items-center gap-3 text-xs text-surface-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(post.publishedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {post.readingMinutes} min read
                        </span>
                      </div>
                      <h2 className="text-lg font-bold tracking-tight text-surface-900 group-hover:text-brand-700">
                        {post.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-surface-600">
                        {post.description}
                      </p>
                      <div className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-brand-700">
                        Read post
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}