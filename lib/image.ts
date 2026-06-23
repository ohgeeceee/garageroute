/**
 * Image utilities — safe to import from client + server contexts.
 * NO `server-only` import here so scripts can also use these helpers.
 */

export function placeholderDataUrl(w: number, h: number): string {
  // SVG data URL for a neutral grey placeholder.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#e5e7eb"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function isRemoteImageUrl(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function imageDomains(): string[] {
  const domains = [
    "localhost",
    "picsum.photos",
    "picsum.photos",
  ];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      domains.push(u.hostname);
    } catch {
      // ignore
    }
  }
  return domains;
}

export async function lqipFromBuffer(_buf: Buffer): Promise<string> {
  // Placeholder — wire up sharp or a fast blurhash library before production.
  return placeholderDataUrl(20, 20);
}
