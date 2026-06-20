import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ScoutWidget from "@/components/ScoutWidget";
import { getCurrentUser } from "@/lib/auth-user";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono-jetbrains",
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

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl()),
  title: {
    default: "GarageRoute — Find garage sales. Plan the route.",
    template: "%s — GarageRoute",
  },
  description:
    "Discover local garage and estate sales, preview items, and build optimized weekend routes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "GarageRoute",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "GarageRoute — Find sales. Plan the route.",
    description:
      "Preview items inside local garage sales and build an optimized Saturday route.",
    type: "website",
    siteName: "GarageRoute",
  },
  twitter: {
    card: "summary_large_image",
    title: "GarageRoute",
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
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
      <body className="min-h-full flex flex-col bg-surface-50 text-surface-900">
        <Providers user={sessionUser}>{children}</Providers>
        <ScoutWidget />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
