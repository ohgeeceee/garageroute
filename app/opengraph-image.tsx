import { ImageResponse } from "next/og";

// 1200x630 default OG/Twitter card. Used by Next.js when a route has no
// explicit opengraph-image and no image is set in the page's `openGraph.images`.
//
// Reachable at /opengraph-image (auto).
//
// Satori (the renderer behind ImageResponse) requires every <div> with more
// than one child to declare display: flex. Forgetting this returns a 502.

export const runtime = "edge";
export const alt = "GarageRoute — Find garage sales. Plan the route.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
        }}
      >
        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            📍
          </div>
          <div style={{ display: "flex" }}>GarageRoute</div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 60,
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          <div style={{ display: "flex" }}>Find treasures.</div>
          <div style={{ display: "flex", color: "#93C5FD" }}>Plan the route.</div>
        </div>

        {/* Footer row */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 28,
            color: "#CBD5E1",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#34D399",
              display: "flex",
            }}
          />
          <div style={{ display: "flex" }}>
            Live now in Montana · garageroute.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}