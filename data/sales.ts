export type Item = {
  id: string;
  name: string;
  category: string;
  price?: number;
  condition: "New" | "Like New" | "Good" | "Fair";
  photo?: string;
  sold?: boolean;
};

export type Sale = {
  id: string;
  title: string;
  type: "Garage/Yard Sale" | "Moving Sale" | "Estate Sale" | "Multi-family" | "Neighborhood";
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  dates: string;
  hours: string;
  description: string;
  seller: string;
  verified: boolean;
  photos: string[];
  items: Item[];
  sellerToken?: string;
  impactKg?: number;
  donationRequested?: boolean;
  donationStatus?: string;
  donationOrg?: string;
  _count?: { queue: number; messages: number; reservations: number };
  reservationTotal?: number;
  /** Computed server-side when the request includes lat/lng/radius. */
  distanceMi?: number | null;
  /** Whether the seller account has verifiedSeller=true. */
  sellerVerifiedSeller?: boolean;
  /** "active" | "ended" | "cancelled". Defaults to "active" if unset. */
  status?: string;
  /** Optional note shown to buyers when the sale is cancelled/ended. */
  statusNote?: string;
};

export const saleTypes = [
  "Garage/Yard Sale",
  "Moving Sale",
  "Estate Sale",
  "Multi-family",
  "Neighborhood",
] as const;

export const categories = [
  "Furniture",
  "Tools",
  "Electronics",
  "Clothing",
  "Toys",
  "Books",
  "Sports",
  "Collectibles",
  "Kitchen",
  "Baby",
  "Vintage",
];

function photo(id: string, w = 400, h = 300) {
  return `https://picsum.photos/seed/${id}/${w}/${h}`;
}

export const mockSales: Sale[] = [
  {
    id: "sale-1",
    title: "Huge Multi-Family Garage Sale",
    type: "Multi-family",
    address: "Decker Ridge Dr",
    city: "Indianapolis",
    state: "IN",
    zip: "46268",
    lat: 39.90018,
    lng: -86.21849,
    dates: "Sat, Jun 20 – Sun, Jun 21",
    hours: "8:00 AM – 2:00 PM",
    description:
      "Kitchenware, furniture, electronics, collectibles, workout equipment, entertainment items and much more. Three families combining inventory.",
    seller: "The Decker Ridge Crew",
    verified: true,
    photos: [photo("deckerridge-1"), photo("deckerridge-2")],
    items: [
      { id: "i1-1", name: "Vintage Pyrex bowls", category: "Kitchen", price: 25, condition: "Good", photo: photo("pyrex", 200, 200) },
      { id: "i1-2", name: "Dumbbell set 5-25 lb", category: "Sports", price: 40, condition: "Like New", photo: photo("dumbbells", 200, 200) },
      { id: "i1-3", name: "Sony stereo receiver", category: "Electronics", price: 35, condition: "Good", photo: photo("sony", 200, 200) },
      { id: "i1-4", name: "Board games", category: "Toys", price: 5, condition: "Good", photo: photo("games", 200, 200) },
    ],
  },
  {
    id: "sale-2",
    title: "Estate Sale – Mid-Century Furniture",
    type: "Estate Sale",
    address: "5653 Kesslerwood Ct",
    city: "Indianapolis",
    state: "IN",
    zip: "46228",
    lat: 39.8521,
    lng: -86.205,
    dates: "Fri, Jun 19 – Sun, Jun 21",
    hours: "9:00 AM – 4:00 PM",
    description:
      "Beautiful mid-century modern furniture, art, ceramics, and household goods from a single owner estate. Everything must go.",
    seller: "Estate Liquidators Indy",
    verified: true,
    photos: [photo("kesslerwood-1"), photo("kesslerwood-2")],
    items: [
      { id: "i2-1", name: "Teak credenza", category: "Furniture", price: 180, condition: "Good", photo: photo("credenza", 200, 200) },
      { id: "i2-2", name: "Ceramic table lamp", category: "Vintage", price: 30, condition: "Like New", photo: photo("lamp", 200, 200) },
      { id: "i2-3", name: "Abstract oil painting", category: "Vintage", price: 75, condition: "Good", photo: photo("painting", 200, 200) },
      { id: "i2-4", name: "Set of 4 dining chairs", category: "Furniture", price: 120, condition: "Fair", photo: photo("chairs", 200, 200) },
    ],
  },
  {
    id: "sale-3",
    title: "Moving Sale – Tools & Sports Gear",
    type: "Moving Sale",
    address: "1205 Collingwood Dr",
    city: "Indianapolis",
    state: "IN",
    zip: "46228",
    lat: 39.845,
    lng: -86.195,
    dates: "Sat, Jun 20",
    hours: "7:00 AM – 12:00 PM",
    description:
      "Downsizing for a cross-country move. Tools, bikes, camping gear, and outdoor furniture. Cash or Venmo accepted.",
    seller: "Marcus T.",
    verified: false,
    photos: [photo("collingwood-1"), photo("collingwood-2")],
    items: [
      { id: "i3-1", name: "Cordless drill set", category: "Tools", price: 55, condition: "Like New", photo: photo("drill", 200, 200) },
      { id: "i3-2", name: "Men's mountain bike", category: "Sports", price: 90, condition: "Good", photo: photo("bike", 200, 200) },
      { id: "i3-3", name: "Camping tent (4-person)", category: "Sports", price: 45, condition: "Good", photo: photo("tent", 200, 200) },
      { id: "i3-4", name: "Adirondack chairs", category: "Furniture", price: 60, condition: "Fair", photo: photo("adirondack", 200, 200) },
    ],
  },
  {
    id: "sale-4",
    title: "Neighborhood Yard Sale",
    type: "Neighborhood",
    address: "79th & Meadowbrook Drive",
    city: "Indianapolis",
    state: "IN",
    zip: "46240",
    lat: 39.888,
    lng: -86.12,
    dates: "Sat, Jun 20",
    hours: "8:00 AM – 1:00 PM",
    description:
      "Over 15 homes participating. Map provided at the corner of 79th & Meadowbrook. Great for kids' clothes, toys, and kitchen items.",
    seller: "Meadowbrook HOA",
    verified: true,
    photos: [photo("meadowbrook-1"), photo("meadowbrook-2")],
    items: [
      { id: "i4-1", name: "Kids clothes 4T-6", category: "Clothing", price: 2, condition: "Good", photo: photo("kidsclothes", 200, 200) },
      { id: "i4-2", name: "Lego bins", category: "Toys", price: 15, condition: "Good", photo: photo("lego", 200, 200) },
      { id: "i4-3", name: "Blender", category: "Kitchen", price: 12, condition: "Like New", photo: photo("blender", 200, 200) },
      { id: "i4-4", name: "Picture frames", category: "Vintage", price: 8, condition: "Good", photo: photo("frames", 200, 200) },
    ],
  },
  {
    id: "sale-5",
    title: "Vintage Toys & Collectibles",
    type: "Garage/Yard Sale",
    address: "3945 Sunmeadow Cir",
    city: "Indianapolis",
    state: "IN",
    zip: "46228",
    lat: 39.855,
    lng: -86.21,
    dates: "Sat, Jun 20",
    hours: "9:00 AM – 3:00 PM",
    description:
      "Collector's paradise. Action figures, trading cards, model kits, and vintage video games. Early birds welcome.",
    seller: "Retro Rick",
    verified: true,
    photos: [photo("sunmeadow-1"), photo("sunmeadow-2")],
    items: [
      { id: "i5-1", name: "Star Wars figures (lot)", category: "Collectibles", price: 50, condition: "Good", photo: photo("starwars", 200, 200) },
      { id: "i5-2", name: "Pokémon cards binder", category: "Collectibles", price: 30, condition: "Like New", photo: photo("pokemon", 200, 200) },
      { id: "i5-3", name: "NES console + games", category: "Electronics", price: 85, condition: "Fair", photo: photo("nes", 200, 200) },
      { id: "i5-4", name: "Model train set", category: "Toys", price: 40, condition: "Good", photo: photo("train", 200, 200) },
    ],
  },
  {
    id: "sale-6",
    title: "Books, Vinyl & Electronics",
    type: "Garage/Yard Sale",
    address: "6422 Maple Dr",
    city: "Indianapolis",
    state: "IN",
    zip: "46220",
    lat: 39.87,
    lng: -86.145,
    dates: "Sat, Jun 27",
    hours: "10:00 AM – 4:00 PM",
    description:
      "Hundreds of books, classic rock vinyl, turntables, and small electronics. Come dig through the crates.",
    seller: "Sarah & Dave",
    verified: false,
    photos: [photo("maple-1"), photo("maple-2")],
    items: [
      { id: "i6-1", name: "Vinyl records (rock)", category: "Books", price: 5, condition: "Good", photo: photo("vinyl", 200, 200) },
      { id: "i6-2", name: "Audio-Technica turntable", category: "Electronics", price: 70, condition: "Like New", photo: photo("turntable", 200, 200) },
      { id: "i6-3", name: "Cookbooks (box)", category: "Books", price: 10, condition: "Good", photo: photo("cookbooks", 200, 200) },
      { id: "i6-4", name: "Bluetooth speaker", category: "Electronics", price: 20, condition: "Good", photo: photo("speaker", 200, 200) },
    ],
  },
  {
    id: "sale-7",
    title: "Baby Gear & Kids Clothes",
    type: "Garage/Yard Sale",
    address: "4721 N Pennsylvania St",
    city: "Indianapolis",
    state: "IN",
    zip: "46205",
    lat: 39.84,
    lng: -86.155,
    dates: "Fri, Jun 19 – Sat, Jun 20",
    hours: "8:00 AM – 12:00 PM",
    description:
      "Everything baby. Crib, stroller, clothes 0-24 months, high chair, toys, and nursing supplies. Smoke-free home.",
    seller: "Jenny K.",
    verified: true,
    photos: [photo("pennsylvania-1"), photo("pennsylvania-2")],
    items: [
      { id: "i7-1", name: "UppaBaby stroller", category: "Baby", price: 120, condition: "Like New", photo: photo("stroller", 200, 200) },
      { id: "i7-2", name: "Convertible crib", category: "Baby", price: 80, condition: "Good", photo: photo("crib", 200, 200) },
      { id: "i7-3", name: "Baby clothes 0-12 mo", category: "Clothing", price: 15, condition: "Good", photo: photo("babyclothes", 200, 200) },
      { id: "i7-4", name: "High chair", category: "Baby", price: 25, condition: "Good", photo: photo("highchair", 200, 200) },
    ],
  },
  {
    id: "sale-8",
    title: "Antiques & Craft Supplies",
    type: "Estate Sale",
    address: "906 Baylor Dr",
    city: "Newark",
    state: "DE",
    zip: "19702",
    lat: 39.6837,
    lng: -75.7497,
    dates: "Fri, Jun 19 – Sun, Jun 21",
    hours: "9:00 AM – 5:00 PM",
    description:
      "Large estate sale with antiques, craft supplies, fabric, sewing machines, and holiday decor. New items added daily.",
    seller: "Delaware Estate Sales",
    verified: true,
    photos: [photo("baylor-1"), photo("baylor-2")],
    items: [
      { id: "i8-1", name: "Singer sewing machine", category: "Vintage", price: 65, condition: "Good", photo: photo("sewing", 200, 200) },
      { id: "i8-2", name: "Quilting fabric bundles", category: "Vintage", price: 20, condition: "New", photo: photo("fabric", 200, 200) },
      { id: "i8-3", name: "Vintage Christmas decor", category: "Collectibles", price: 35, condition: "Good", photo: photo("christmas", 200, 200) },
      { id: "i8-4", name: "Brass candlesticks", category: "Vintage", price: 12, condition: "Good", photo: photo("candlesticks", 200, 200) },
    ],
  },
];

export function getSaleById(id: string): Sale | undefined {
  return mockSales.find((sale) => sale.id === id);
}
