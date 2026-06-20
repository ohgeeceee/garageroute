export interface SafeSpot {
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const safeSpots: SafeSpot[] = [
  {
    name: "Indianapolis Metropolitan Police - North District",
    address: "3120 E 30th St",
    city: "Indianapolis",
    state: "IN",
    lat: 39.8106,
    lng: -86.1125,
  },
  {
    name: "Indianapolis Public Library - Central",
    address: "40 E St Clair St",
    city: "Indianapolis",
    state: "IN",
    lat: 39.7767,
    lng: -86.1563,
  },
  {
    name: "Castleton Square Mall",
    address: "6020 E 82nd St",
    city: "Indianapolis",
    state: "IN",
    lat: 39.9047,
    lng: -86.0467,
  },
  {
    name: "Meijer Supermarket Parking Lot",
    address: "8275 E 96th St",
    city: "Fishers",
    state: "IN",
    lat: 39.9273,
    lng: -85.999,
  },
];
