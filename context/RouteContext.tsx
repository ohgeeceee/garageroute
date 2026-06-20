"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Sale } from "@/data/sales";

type RouteContextType = {
  itinerary: Sale[];
  addSale: (sale: Sale) => void;
  removeSale: (id: string) => void;
  clearItinerary: () => void;
  isInItinerary: (id: string) => boolean;
  reorderItinerary: (sales: Sale[]) => void;
};

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [itinerary, setItinerary] = useState<Sale[]>([]);

  const addSale = useCallback((sale: Sale) => {
    setItinerary((prev) =>
      prev.some((s) => s.id === sale.id) ? prev : [...prev, sale]
    );
  }, []);

  const removeSale = useCallback((id: string) => {
    setItinerary((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearItinerary = useCallback(() => {
    setItinerary([]);
  }, []);

  const isInItinerary = useCallback(
    (id: string) => itinerary.some((s) => s.id === id),
    [itinerary]
  );

  const reorderItinerary = useCallback((sales: Sale[]) => {
    setItinerary(sales);
  }, []);

  return (
    <RouteContext.Provider
      value={{
        itinerary,
        addSale,
        removeSale,
        clearItinerary,
        isInItinerary,
        reorderItinerary,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoute must be used within a RouteProvider");
  }
  return context;
}
