"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, ArrowRight } from "lucide-react";
import { mockSales, categories } from "@/data/sales";
import Link from "next/link";

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const results = useMemo(() => {
    const term = query.toLowerCase().trim();
    return mockSales
      .flatMap((sale) =>
        sale.items.map((item) => ({
          ...item,
          saleTitle: sale.title,
          saleId: sale.id,
          city: sale.city,
          zip: sale.zip,
          price: item.price ?? Math.floor(Math.random() * 40) + 5,
        }))
      )
      .filter((item) => {
        const matchesTerm =
          !term ||
          item.name.toLowerCase().includes(term) ||
          item.saleTitle.toLowerCase().includes(term);
        const matchesCategory = !category || item.category === category;
        return matchesTerm && matchesCategory;
      })
      .slice(0, 5);
  }, [query, category]);

  return (
    <div className="relative overflow-hidden rounded-2xl glass-strong p-6 shadow-2xl sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items: vinyl, drill, Pyrex…"
            aria-label="Search items inside sales"
            className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-surface-400/80 transition focus:outline-none focus:ring-2 focus:ring-brand-400/70 focus:border-brand-400/50"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-12 cursor-pointer rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white transition focus:outline-none focus:ring-2 focus:ring-brand-400/70"
        >
          <option value="" className="bg-surface-900">
            Any category
          </option>
          {categories.map((c) => (
            <option key={c} value={c} className="bg-surface-900">
              {c}
            </option>
          ))}
        </select>

        <Link
          href={`/sales?query=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`}
          className="btn-brand cursor-pointer h-12! px-5! text-sm!"
        >
          Find sales
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        {results.length === 0 ? (
          <p className="text-sm text-surface-300/80">
            Type above to preview real items listed this weekend.
          </p>
        ) : (
          results.map((item, i) => (
            <Link
              key={`${item.saleId}-${item.id}-${i}`}
              href={`/sales/${item.saleId}`}
              className="group flex items-center justify-between rounded-xl bg-white/5 p-3 transition hover:bg-white/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.photo || "https://picsum.photos/200"}
                  alt=""
                  aria-hidden="true"
                  className="h-10 w-10 shrink-0 rounded-lg object-cover bg-white/5"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white group-hover:text-brand-300 transition">
                    {item.name}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-surface-300/70">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {item.saleTitle} · {item.city} {item.zip}
                    </span>
                  </p>
                </div>
              </div>
              <span className="ml-3 shrink-0 text-sm font-bold text-success-500">
                ${item.price}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
