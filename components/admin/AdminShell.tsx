"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  BadgeCheck,
  ShieldCheck,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Building2,
  Menu,
  ScrollText,
  Command,
} from "lucide-react";
import CommandPalette from "@/components/admin/CommandPalette";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/sales",         label: "Sales",         icon: Package },
      { href: "/admin/verifications", label: "Sale verifications", icon: BadgeCheck },
      { href: "/admin/seller-verifications", label: "Seller verifications", icon: ShieldCheck },
      { href: "/admin/users",         label: "Users",         icon: Users },
      { href: "/admin/messages",      label: "Messages",      icon: MessageSquare },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit",    label: "Audit log", icon: ScrollText },
      { href: "/admin/settings", label: "Settings",  icon: Settings },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Open command palette with ⌘K / Ctrl-K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const logout = async () => {
    await fetch("/api/admin", { method: "DELETE" });
    router.replace("/admin/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const currentPage =
    navGroups.flatMap((g) => g.items).find((i) => isActive(i.href))?.label ?? "Admin";

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-surface-200 bg-surface-0">
        <SidebarContent isActive={isActive} onNavigate={() => setSidebarOpen(false)} />
        <div className="border-t border-surface-200 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold text-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-surface-900">Admin User</p>
              <p className="truncate text-xs text-surface-500">admin@garageroute.com</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-surface-900/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-surface-200 bg-surface-0">
            <SidebarContent isActive={isActive} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-surface-200 bg-surface-0 px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-surface-600 hover:bg-surface-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb / page title */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-base font-semibold text-surface-900">{currentPage}</h1>
          </div>

          {/* Command palette trigger (search) */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            className="hidden md:inline-flex flex-1 max-w-md ml-4 items-center gap-2 rounded-md border border-surface-200 bg-surface-50 px-3 py-1.5 text-left text-sm text-surface-500 transition hover:border-surface-300 hover:bg-surface-0"
          >
            <Search className="h-4 w-4 text-surface-400" aria-hidden="true" />
            <span className="flex-1 truncate">Search sales, users, items…</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-surface-200 bg-surface-0 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-surface-500 sm:inline-flex">
              <Command className="h-3 w-3" aria-hidden="true" />K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100"
            >
              <Building2 className="h-3.5 w-3.5" />
              View public site
            </Link>
            <button
              className="relative rounded-md p-2 text-surface-600 hover:bg-surface-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error-500 ring-2 ring-surface-0" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scroll-y">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-surface-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <LayoutDashboard className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-surface-900">GarageRoute</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">Admin Console</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-y px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="eyebrow px-2 mb-1.5">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className="nav-link"
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
