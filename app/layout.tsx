import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
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

export const metadata: Metadata = {
  title: "GarageRoute — Operations Console",
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
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
