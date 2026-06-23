import type { NextConfig } from "next";
import path from "node:path";

/**
 * Build the list of hostnames Next/Image is allowed to fetch and optimize.
 *
 * Sources:
 *   - S3_PUBLIC_URL (CloudFront / bucket website) — when the bucket is public
 *   - S3_BUCKET (+ S3_REGION) — AWS S3 virtual-hosted style hostnames
 *   - NEXT_PUBLIC_APP_URL — same-origin uploads via reverse proxy
 *   - picsum.photos — fallback image service used by the seed data
 *   - localhost — dev-time uploads served by the local driver
 */
function buildRemoteImagePatterns(): Array<{ protocol: "https" | "http"; hostname: string }> {
  const patterns: Array<{ protocol: "https" | "http"; hostname: string }> = [];

  const fromEnv = (process.env.S3_PUBLIC_URL || "").trim();
  if (fromEnv) {
    try {
      const u = new URL(fromEnv);
      patterns.push({ protocol: u.protocol.replace(":", "") as "https" | "http", hostname: u.hostname });
    } catch { /* ignore malformed */ }
  }

  const bucket = (process.env.S3_BUCKET || "").trim();
  const region = (process.env.S3_REGION || "us-east-1").trim();
  if (bucket && !patterns.some((p) => p.hostname.includes(bucket))) {
    // Standard S3 website / REST virtual-hosted hostnames.
    patterns.push({ protocol: "https", hostname: `${bucket}.s3.${region}.amazonaws.com` });
    patterns.push({ protocol: "https", hostname: `${bucket}.s3-${region}.amazonaws.com` });
    patterns.push({ protocol: "https", hostname: `${bucket}.s3-website-${region}.amazonaws.com` });
  }

  // Local uploads served via the same Next.js origin in dev (e.g. http://localhost:3000/uploads/...).
  // We include localhost for dev convenience; production deployments typically proxy /uploads to
  // S3/CDN so this never matters. NEXT_PUBLIC_APP_URL handles prod behind a custom domain.
  patterns.push({ protocol: "http", hostname: "localhost" });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      if (!patterns.some((p) => p.hostname === u.hostname && p.protocol === u.protocol.replace(":", ""))) {
        patterns.push({ protocol: u.protocol.replace(":", "") as "https" | "http", hostname: u.hostname });
      }
    } catch { /* ignore malformed */ }
  }

  // picsum.photos — the seed data uses https://picsum.photos/400/300 as a placeholder.
  // Allowing it lets next/image optimize those without breaking the seed.
  patterns.push({ protocol: "https", hostname: "picsum.photos" });

  return patterns;
}

const nextConfig: NextConfig = {
  // Web build remains a normal Next.js Node server.
  // The mobile app is a Capacitor webview pointing at the live URL (see capacitor.config.ts).
  //
  // Type-check at build time is ENABLED in production — we want type errors to
  // fail the build, not get swept under the rug. (Was `ignoreBuildErrors: true`
  // in the prototype; removed during the production-readiness pass.)
  typescript: { ignoreBuildErrors: false },
  images: {
    remotePatterns: buildRemoteImagePatterns(),
  },
  // Tell Turbopack the project root so it doesn't try to use the parent
  // ~/package-lock.json as the workspace root (silences the multi-lockfile
  // warning on every build).
  turbopack: {
    root: path.join(__dirname),
  },
  // Static export — opt in with `NEXT_OUTPUT_EXPORT=1` (see npm run build:static).
  // Used by the Capacitor mobile build (`mobile:sync` consumes ./out).
  // Don't enable for the server deploy — Vercel serves the Node.js build
  // and uses ISR for the city/state pages.
  ...(process.env.NEXT_OUTPUT_EXPORT === "1"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
  // Sensible default security headers. Mirrored by vercel.json so they
  // apply on every deploy target (Vercel, self-hosted, etc.).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
