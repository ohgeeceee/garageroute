"use client";

import { Check, Plus } from "lucide-react";
import { Sale } from "@/data/sales";
import { useRoute } from "@/context/RouteContext";
import { track } from "@/lib/analytics";

export default function AddToRouteButton({ sale }: { sale: Sale }) {
  const { addSale, removeSale, isInItinerary } = useRoute();
  const inRoute = isInItinerary(sale.id);

  if (inRoute) {
    return (
      <button
        onClick={() => {
          removeSale(sale.id);
          track("route_remove_sale", { sale_id: sale.id });
        }}
        className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
      >
        <Check className="h-4 w-4" />
        In route
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        addSale(sale);
        track("route_add_sale", { sale_id: sale.id, city: sale.city });
      }}
      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      <Plus className="h-4 w-4" />
      Add to route
    </button>
  );
}
