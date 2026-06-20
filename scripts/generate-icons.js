const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#2563eb"/>
  <path d="M50 18 L18 45 L24 45 L24 76 L42 76 L42 58 H58 V76 H76 V45 L82 45 Z" fill="white"/>
  <text x="50" y="88" font-family="Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="white">GarageRoute</text>
</svg>
`;

async function main() {
  const outDir = path.join(__dirname, "..", "public", "icons");
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svg(size)))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
