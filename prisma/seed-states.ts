// @ts-nocheck — pre-existing module resolution quirk under Next's bundler mode
import { PrismaClient } from "@prisma/client";

/**
 * Seed the state network (Phase 11+).
 *
 * The bare domain (`garageroute.com`) is the canonical entry point.
 * State subdomains (`montana.garageroute.com`, etc.) carry the
 * market-by-market rollout. Indiana is the live home market; the
 * rest are `preview` until we actually start ingesting sales in
 * each state. The /states page shows preview rows so the network
 * has the right "coming soon" energy before launch.
 *
 * This is intentionally a small baseline — operators add the rest
 * from the admin panel (POST /api/admin/states). Edit the list
 * below only when the network definition itself changes.
 */

type StateSeed = {
  slug: string;
  name: string;
  abbreviation: string;
  lat: number;
  lng: number;
  status: "live" | "preview" | "seeding" | "paused";
  tagline: string;
  sortOrder: number;
  targetCities: string[];
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
};

const STATES: StateSeed[] = [
  {
    slug: "indiana",
    name: "Indiana",
    abbreviation: "IN",
    lat: 39.7684,
    lng: -86.1581,
    status: "live",
    tagline: "Home market. Indianapolis, Fort Wayne, South Bend, Bloomington.",
    sortOrder: 1,
    targetCities: ["Indianapolis", "Fort Wayne", "South Bend", "Bloomington", "Evansville"],
    minLat: 37.7717,
    maxLat: 41.7606,
    minLng: -88.0979,
    maxLng: -84.7846,
  },
  {
    slug: "ohio",
    name: "Ohio",
    abbreviation: "OH",
    lat: 40.4173,
    lng: -82.9071,
    status: "preview",
    tagline: "Columbus, Cleveland, Cincinnati — coming next.",
    sortOrder: 2,
    targetCities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"],
    minLat: 38.4034,
    maxLat: 41.9779,
    minLng: -84.8203,
    maxLng: -80.5182,
  },
  {
    slug: "michigan",
    name: "Michigan",
    abbreviation: "MI",
    lat: 44.3148,
    lng: -85.6024,
    status: "preview",
    tagline: "Detroit, Grand Rapids, Ann Arbor — coming soon.",
    sortOrder: 3,
    targetCities: ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing", "Kalamazoo"],
    minLat: 41.6961,
    maxLat: 48.3065,
    minLng: -90.4186,
    maxLng: -82.1228,
  },
  {
    slug: "illinois",
    name: "Illinois",
    abbreviation: "IL",
    lat: 40.6331,
    lng: -89.3985,
    status: "preview",
    tagline: "Chicago, Springfield, Champaign — coming soon.",
    sortOrder: 4,
    targetCities: ["Chicago", "Springfield", "Champaign", "Peoria", "Rockford"],
    minLat: 36.9703,
    maxLat: 42.5083,
    minLng: -91.5131,
    maxLng: -87.4962,
  },
  {
    slug: "kentucky",
    name: "Kentucky",
    abbreviation: "KY",
    lat: 37.8393,
    lng: -84.27,
    status: "preview",
    tagline: "Louisville, Lexington, Bowling Green — coming soon.",
    sortOrder: 5,
    targetCities: ["Louisville", "Lexington", "Bowling Green", "Covington", "Owensboro"],
    minLat: 36.4971,
    maxLat: 39.1478,
    minLng: -89.5712,
    maxLng: -81.9647,
  },
];

export async function seedStates(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const s of STATES) {
      await prisma.state.upsert({
        where: { slug: s.slug },
        update: {
          name: s.name,
          abbreviation: s.abbreviation,
          lat: s.lat,
          lng: s.lng,
          status: s.status,
          tagline: s.tagline,
          sortOrder: s.sortOrder,
          targetCities: JSON.stringify(s.targetCities),
          minLat: s.minLat ?? null,
          maxLat: s.maxLat ?? null,
          minLng: s.minLng ?? null,
          maxLng: s.maxLng ?? null,
        },
        create: {
          slug: s.slug,
          name: s.name,
          abbreviation: s.abbreviation,
          lat: s.lat,
          lng: s.lng,
          status: s.status,
          tagline: s.tagline,
          sortOrder: s.sortOrder,
          targetCities: JSON.stringify(s.targetCities),
          minLat: s.minLat ?? null,
          maxLat: s.maxLat ?? null,
          minLng: s.minLng ?? null,
          maxLng: s.maxLng ?? null,
        },
      });
    }
    console.log(`Seeded ${STATES.length} states.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedStates().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
