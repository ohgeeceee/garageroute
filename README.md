# GarageRoute.com

A Next.js prototype for a garage/yard sale discovery and route-planning platform. It differentiates from existing ad boards by letting buyers search **inside** sales for specific items and build an optimized Saturday driving route.

## Niche positioning

- Searchable pre-sale inventory (items, prices, condition, photos)
- Smart route planner with map + distance estimate
- Verified seller badges
- Real-time updates (UI ready for future WebSocket/API integration)
- Mobile-first, modern UX

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Maps:** Leaflet + OpenStreetMap
- **Icons:** Lucide React
- **Data:** Mock sales in `data/sales.ts`

## Getting started

```bash
cd garageroute
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — Landing page with features and featured sales
- `/sales` — Browse/search sales with interactive map
- `/sales/[id]` — Sale detail with item list and map
- `/route` — Route planner / itinerary
- `/post` — Post a sale form
- `/about` — About the niche

## Domain

`GarageRoute.com` was verified as available through Verisign at the time of this build.

## Notes

This is a functional frontend prototype. A production version would need:

- A backend/database for real listings
- User authentication
- Image uploads
- Geocoding for addresses
- Real routing API (e.g., OSRM, Mapbox, Google Directions)
- Payment/verification flows
