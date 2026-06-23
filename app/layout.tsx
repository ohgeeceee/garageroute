import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ScoutWidget from "@/components/ScoutWidget";
import MobileTabBar from "@/components/MobileTabBar";
import { getCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono-jet",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Base URL for all absolute metadata. Falls back to localhost for dev.
 * This needs to be set so that OpenGraph/Twitter images, canonical
 * URLs, and JSON-LD all resolve to a real host in production.
 */
const DEFAULT_APP_URL = "http://localhost:3000";
function appBaseUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  return fromEnv || DEFAULT_APP_URL;
}

const PLAUSIBLE_DOMAIN = "garageroute.com";

/**
 * Build the alternates map for hreflang.
 *
 * On the bare domain we declare every live state as a language variant
 * (`en-US-mt`, `en-US-co`, ...) and the bare domain as the x-default.
 *
 * On a state subdomain (resolved via the `x-state-slug` header set by
 * proxy.ts) we declare that subdomain as the canonical English variant
 * for its state and the bare domain as x-default.
 *
 * Google uses hreflang to consolidate duplicate content across regional
 * subdomains and serve the right variant per user locale.
 */
async function buildAlternates(stateSlug: string | null) {
  const liveStates = await prisma.state.findMany({
    where: { status: "live" },
    select: { slug: true, abbreviation: true },
  });

  // state_slug → USPS code (e.g. "montana" → "MT")
  const slugToAbbr = new Map(liveStates.map((s) => [s.slug, s.abbreviation]));

  if (stateSlug) {
    // State-subdomain branch: self is canonical, others are alternates.
    const languages: Record<string, string> = { "x-default": "https://garageroute.com" };
    for (const s of liveStates) {
      languages[`en-US-${s.abbreviation.toLowerCase()}`] =
        s.slug === stateSlug
          ? `https://${s.slug}.garageroute.com`
          : `https://${s.slug}.garageroute.com`;
    }
    return {
      canonical: `https://${stateSlug}.garageroute.com`,
      languages,
    };
  }

  // Bare-domain branch: x-default + each state as its own variant.
  const languages: Record<string, string> = { "x-default": "https://garageroute.com" };
  for (const s of liveStates) {
    languages[`en-US-${s.abbreviation.toLowerCase()}`] = `https://${s.slug}.garageroute.com`;
  }
  return {
    canonical: "https://garageroute.com",
    languages,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import("next/headers");
  const reqHeaders = await headers();
  const stateSlug = reqHeaders.get("x-state-slug") ?? null;

  const alternates = await buildAlternates(stateSlug);
  const stateName = reqHeaders.get("x-state-name");

  if (stateSlug && stateName) {
    return {
      metadataBase: new URL(appBaseUrl()),
      title: {
        default: `${stateName} GarageRoute — Find garage sales. Plan the route.`,
        template: "%s — GarageRoute",
      },
      description: `Browse garage sales, estate sales, and yard sales in ${stateName}. Post your own sale in minutes.`,
      alternates,
      openGraph: {
        title: `${stateName} GarageRoute — Find garage sales. Plan the route.`,
        description: `Browse garage sales, estate sales, and yard sales in ${stateName}. Post your own sale in minutes.`,
        type: "website",
        siteName: "GarageRoute",
        url: `https://${stateSlug}.garageroute.com`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${stateName} GarageRoute`,
        description: `Browse garage sales, estate sales, and yard sales in ${stateName}. Post your own sale in minutes.`,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    };
  }

  return {
    metadataBase: new URL(appBaseUrl()),
    title: {
      default: "GarageRoute — Find garage sales. Plan the route.",
      template: "%s — GarageRoute",
    },
    description:
      "Discover local garage and estate sales, preview items, and build optimized weekend routes.",
    alternates,
    openGraph: {
      title: "GarageRoute — Find sales. Plan the route.",
      description:
        "Preview items inside local garage sales and build an optimized Saturday route.",
      type: "website",
      siteName: "GarageRoute",
      url: "https://garageroute.com",
    },
    twitter: {
      card: "summary_large_image",
      title: "GarageRoute — Find garage sales. Plan the route.",
      description:
        "Preview items inside local garage sales and build an optimized Saturday route.",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      title: "GarageRoute",
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  // Extend the layout under the iPhone notch / Dynamic Island so the
  // MobileTabBar's safe-area-inset-bottom actually has a non-zero value
  // on real devices. Harmless on Android.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const sessionUser = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        verifiedSeller: user.verifiedSeller,
      }
    : null;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-50 text-surface-900 pb-16 md:pb-0">
        <Providers user={sessionUser}>{children}</Providers>
        <MobileTabBar />
        <ScoutWidget />
        <ServiceWorkerRegistration />
        {/* Plausible Analytics — privacy-friendly, no cookie banner required */}
        <Script
          defer
          data-domain={PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}