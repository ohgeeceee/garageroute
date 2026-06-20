"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  PlusCircle,
  Route,
  Search,
  Menu,
  X,
  Compass,
  ChevronDown,
  Briefcase,
  Newspaper,
  Mail,
  Lock,
  Activity,
  FileText,
  Shield,
  Cookie,
  UserCircle2,
  LayoutDashboard,
  LogOut,
  BadgeCheck,
} from "lucide-react";
import { useRoute } from "@/context/RouteContext";
import type { SessionUser } from "./Providers";

const primary = [
  { href: "/sales", label: "Browse Sales", icon: Search },
  { href: "/routes", label: "Themed Routes", icon: Compass },
  { href: "/route", label: "My Route", icon: Route },
  { href: "/post", label: "Post Sale", icon: PlusCircle },
];

const company = [
  { href: "/about",     label: "About",     icon: FileText },
  { href: "/careers",   label: "Careers",   icon: Briefcase },
  { href: "/press",     label: "Press",     icon: Newspaper },
  { href: "/contact",   label: "Contact",   icon: Mail },
];

const trust = [
  { href: "/security", label: "Security", icon: Lock },
  { href: "/status",   label: "Status",   icon: Activity },
];

const legal = [
  { href: "/legal/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/legal/terms",   label: "Terms of Service", icon: FileText },
  { href: "/legal/cookies", label: "Cookie Policy",   icon: Cookie },
];

export default function Navbar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { itinerary } = useRoute();
  const [open, setOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCompanyOpen(false);
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-surface-0/90 backdrop-blur supports-[backdrop-filter]:bg-surface-0/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-brand">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-base font-bold tracking-tight text-surface-900">
            GarageRoute
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {primary.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {link.label}
                {link.href === "/route" && itinerary.length > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {itinerary.length}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Company dropdown */}
          <div ref={companyRef} className="relative">
            <button
              type="button"
              onClick={() => setCompanyOpen((o) => !o)}
              aria-expanded={companyOpen}
              aria-haspopup="true"
              className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive("/about") ||
                isActive("/careers") ||
                isActive("/press") ||
                isActive("/contact")
                  ? "bg-brand-50 text-brand-700"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
              }`}
            >
              Company
              <ChevronDown
                className={`h-3.5 w-3.5 transition ${companyOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {companyOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-[420px] origin-top-right rounded-xl border border-surface-200 bg-surface-0 p-3 shadow-elevated animate-fade-in"
              >
                <div className="grid grid-cols-2 gap-1">
                  <DropdownGroup title="Company" items={company} onPick={() => setCompanyOpen(false)} />
                  <DropdownGroup title="Trust" items={trust} onPick={() => setCompanyOpen(false)} />
                </div>
                <div className="mt-2 border-t border-surface-100 pt-2">
                  <DropdownGroup title="Legal" items={legal} onPick={() => setCompanyOpen(false)} horizontal />
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Desktop auth cluster */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <div ref={userRef} className="relative">
              <button
                type="button"
                onClick={() => setUserOpen((o) => !o)}
                aria-expanded={userOpen}
                aria-haspopup="true"
                className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-0 py-1 pl-1 pr-3 text-sm font-medium text-surface-700 transition hover:border-surface-300 hover:bg-surface-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">{user.name.split(" ")[0]}</span>
                {user.verifiedSeller && <BadgeCheck className="h-3.5 w-3.5 text-success-600" aria-label="Verified seller" />}
                <ChevronDown className={`h-3.5 w-3.5 transition ${userOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              {userOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-surface-200 bg-surface-0 p-2 shadow-elevated animate-fade-in"
                >
                  <div className="border-b border-surface-100 px-3 pb-2 pt-1">
                    <p className="truncate text-sm font-semibold text-surface-900">{user.name}</p>
                    <p className="truncate text-xs text-surface-500">{user.email}</p>
                  </div>
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={() => setUserOpen(false)}
                    className="mt-1 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-surface-700 transition hover:bg-surface-50 hover:text-surface-900"
                  >
                    <LayoutDashboard className="h-4 w-4 text-surface-400" aria-hidden="true" />
                    Account dashboard
                  </Link>
                  <Link
                    href="/account/sales"
                    role="menuitem"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-surface-700 transition hover:bg-surface-50 hover:text-surface-900"
                  >
                    <PlusCircle className="h-4 w-4 text-surface-400" aria-hidden="true" />
                    My sales
                  </Link>
                  <Link
                    href="/account/profile"
                    role="menuitem"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-surface-700 transition hover:bg-surface-50 hover:text-surface-900"
                  >
                    <UserCircle2 className="h-4 w-4 text-surface-400" aria-hidden="true" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-surface-700 transition hover:bg-surface-50 hover:text-surface-900"
                  >
                    <LogOut className="h-4 w-4 text-surface-400" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 hover:text-surface-900">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                <UserCircle2 className="h-4 w-4" />
                Create account
              </Link>
            </>
          )}
        </div>

        {/* Mobile right cluster */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/route"
            aria-label="My route"
            className="relative inline-flex h-9 items-center gap-1 rounded-full bg-brand-600 px-3 text-sm font-semibold text-white shadow-brand hover:bg-brand-700"
          >
            <Route className="h-3.5 w-3.5" aria-hidden="true" />
            Route
            {itinerary.length > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-700">
                {itinerary.length}
              </span>
            )}
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-2 text-surface-600 hover:bg-surface-100"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-surface-200 bg-surface-0 md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <p className="eyebrow px-2 pb-1">Marketplace</p>
            <nav className="flex flex-col gap-0.5">
              {primary.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-surface-700 hover:bg-surface-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <p className="eyebrow px-2 pb-1 pt-4">Account</p>
            {user ? (
              <nav className="flex flex-col gap-0.5">
                <Link href="/account" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">{user.name}</Link>
                <Link href="/account/sales" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">My sales</Link>
                <Link href="/account/profile" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">Profile</Link>
                <button onClick={() => { setOpen(false); signOut(); }} className="rounded-md px-3 py-2 text-left text-sm font-medium text-surface-700 hover:bg-surface-50">Sign out</button>
              </nav>
            ) : (
              <nav className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn btn-secondary">Sign in</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn btn-primary">Create account</Link>
              </nav>
            )}

            <p className="eyebrow px-2 pb-1 pt-4">Company</p>
            <nav className="flex flex-col gap-0.5">
              {[...company, ...trust, ...legal].map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-surface-700 hover:bg-surface-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function DropdownGroup({
  title,
  items,
  onPick,
  horizontal = false,
}: {
  title: string;
  items: { href: string; label: string; icon: React.ElementType }[];
  onPick: () => void;
  horizontal?: boolean;
}) {
  return (
    <div className={horizontal ? "" : ""}>
      <p className="eyebrow px-2 pb-1">{title}</p>
      <ul
        className={
          horizontal
            ? "flex flex-wrap gap-1"
            : "flex flex-col gap-0.5"
        }
      >
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.href} className={horizontal ? "" : ""}>
              <Link
                href={it.href}
                onClick={onPick}
                role="menuitem"
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-surface-700 transition hover:bg-surface-50 hover:text-surface-900"
              >
                <Icon className="h-3.5 w-3.5 text-surface-400" aria-hidden="true" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
