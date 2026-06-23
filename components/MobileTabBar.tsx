"use client";

/**
 * MobileTabBar — bottom tab bar for <md screens.
 *
 * Renders nothing on >=md (desktop still uses the top Navbar). On mobile it
 * shows a 5-slot bar: Browse · Route · (centered FAB) Post · Saved · Account.
 * "Saved" is wired to /account because that's where the favorites section
 * already lives; revisit if/when we get a dedicated /favorites route.
 *
 * The bar respects iOS safe-area insets (env(safe-area-inset-bottom)) and
 * uses fixed positioning so it stays at the bottom while content scrolls.
 *
 * Why it's a client component: needs usePathname() for active highlighting
 * and useRoute() for the Route tab's itinerary count badge.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Search,
  Route,
  Plus,
  Heart,
  UserCircle2,
} from "lucide-react";
import { useRoute } from "@/context/RouteContext";

type Tab = {
  href: string;
  label: string;
  icon: React.ElementType;
  match: (path: string) => boolean;
};

const tabs: Tab[] = [
  {
    href: "/sales",
    label: "Browse",
    icon: Search,
    match: (p) => p === "/sales" || p.startsWith("/sales/"),
  },
  {
    href: "/route",
    label: "Route",
    icon: Route,
    match: (p) => p === "/route",
  },
  // center slot is the FAB, not a tab
  {
    href: "/post",
    label: "Saved",
    icon: Heart,
    match: (p) =>
      p === "/account" || p.startsWith("/account/") || p.startsWith("/favorites"),
  },
  {
    href: "/account",
    label: "Account",
    icon: UserCircle2,
    match: (p) => p === "/account" || p.startsWith("/account/"),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname() || "/";
  const { itinerary } = useRoute();
  // Hide-on-scroll-down for a more native feel (mirrors iOS Safari bottom bar).
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        // Only react to meaningful scroll, ignore bounces near the top.
        if (y < 64) {
          setVisible(true);
        } else if (delta > 4 && y > 200) {
          setVisible(false);
        } else if (delta < -4) {
          setVisible(true);
        }
        setLastY(y);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  return (
    <nav
      aria-label="Primary"
      // hidden on >=md
      className={`fixed inset-x-0 bottom-0 z-40 md:hidden transition-transform duration-200 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      // CSS safe-area: keeps the bar above the iPhone home indicator.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="relative mx-auto flex h-16 max-w-7xl items-end justify-around border-t border-surface-200 bg-surface-0/95 px-2 pb-2 pt-1.5 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-surface-0/80"
      >
        {tabs.slice(0, 2).map((t) => (
          <TabLink key={t.href} tab={t} active={t.match(pathname)} badge={t.href === "/route" ? itinerary.length : 0} />
        ))}

        {/* Center FAB — Post Sale. Sits visually higher than the rest of the bar. */}
        <Link
          href="/post"
          aria-label="Post a sale"
          className="relative -mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.45)] ring-4 ring-surface-0 transition active:scale-95"
        >
          <Plus className="h-7 w-7" aria-hidden="true" />
        </Link>

        {tabs.slice(2).map((t) => (
          <TabLink key={t.href} tab={t} active={t.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  tab,
  active,
  badge = 0,
}: {
  tab: Tab;
  active: boolean;
  badge?: number;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium transition ${
        active ? "text-brand-700" : "text-surface-500 hover:text-surface-800"
      }`}
    >
      <span className="relative">
        <Icon className="h-5 w-5" aria-hidden="true" />
        {badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {tab.label}
    </Link>
  );
}
