import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * Dynamic XML sitemap.
 *
 * Rules:
 *  - Only emit URLs that actually render (HTTP 200). Dead URLs in the sitemap
 *    waste crawl budget and erode trust with Google.
 *  - Live state subdomains are emitted with absolute URLs to <slug>.garageroute.com.
 *  - Per-sale detail pages are emitted so each Event schema can be indexed.
 *  - Static utility pages (about, contact, etc.) are listed with conservative
 *    changeFrequency / priority.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl =
    (process.env.NEXT_PUBLIC_APP_URL || "https://www.garageroute.com").replace(
      /\/$/,
      ""
    );

  // Static routes — only include pages that exist in app/.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${appUrl}/sales`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
    {
      url: `${appUrl}/post`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${appUrl}/states`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${appUrl}/routes`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${appUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${appUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
    {
      url: `${appUrl}/press`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
    {
      url: `${appUrl}/security`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
    {
      url: `${appUrl}/status`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.3,
    },
    {
      url: `${appUrl}/careers`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
  ];

  // Per-sale detail URLs — only emit sales with a future-ish last update.
  // For an early-stage marketplace we keep this unbounded but cap at 5000
  // to avoid pathological cases.
  const sales = await prisma.sale.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const saleRoutes: MetadataRoute.Sitemap = sales.map((s) => ({
    url: `${appUrl}/sales/${s.id}`,
    lastModified: s.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Blog — list page + each post. Read from filesystem at build time.
  const { getAllPosts } = await import("@/lib/blog");
  const posts = getAllPosts();
  const blogRoutes: MetadataRoute.Sitemap = [
    {
      url: `${appUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    ...posts.map((p) => ({
      url: `${appUrl}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt ?? p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  // Live state subdomains — both the root and the /sales browse page.
  const liveStates = await prisma.state.findMany({
    where: { status: "live" },
    select: { slug: true, updatedAt: true },
  });

  const stateSubdomainRoutes: MetadataRoute.Sitemap = liveStates
    .map((s) => [
      {
        url: `https://${s.slug}.garageroute.com`,
        lastModified: s.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `https://${s.slug}.garageroute.com/sales`,
        lastModified: s.updatedAt,
        changeFrequency: "hourly" as const,
        priority: 0.85,
      },
    ])
    .flat();

  // Programmatic city pages — only emit (city, state) combos that have at least
  // one sale. This is the highest-leverage SEO surface: "garage sales in <city>"
  // intent × locality. Capped at 2000 to avoid pathological cases.
  const cityCombos = await prisma.sale.findMany({
    select: { city: true, state: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 2000,
    distinct: ["city", "state"],
  });

  const { buildCitySlug } = await import("@/lib/city-slug");
  const cityRoutes: MetadataRoute.Sitemap = cityCombos.map((c) => ({
    url: `${appUrl}/sales/city/${buildCitySlug(c.city, c.state)}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...saleRoutes,
    ...stateSubdomainRoutes,
    ...cityRoutes,
    ...blogRoutes,
  ];
}