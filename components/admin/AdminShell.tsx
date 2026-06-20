"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  BadgeCheck,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Building2,
  Menu,
  ShieldCheck,
  Inbox,
  Bot,
} from "lucide-react";

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
      { href: "/admin/sales",         label: "Sales",         icon: Package, badgeKey: "saleVerifications" as const },
      { href: "/admin/verifications", label: "Sale Verifications", icon: BadgeCheck, badgeKey: "saleVerifications" as const },
      { href: "/admin/seller-verifications", label: "Seller Verifications", icon: ShieldCheck, badgeKey: "sellerVerifications" as const },
      { href: "/admin/users",         label: "Users",         icon: Users },
      { href: "/admin/inbox",         label: "Email Inbox",   icon: Inbox, badgeKey: "unreadInbox" as const },
      { href: "/admin/messages",      label: "Buyer Messages", icon: MessageSquare, badgeKey: "unreadMessages" as const },
      { href: "/admin/conversations", label: "Scout (Bot)",   icon: Bot },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/bot-analytics", label: "Bot Analytics", icon: Bot },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

type Counts = {
  sellerVerifications: number;
  saleVerifications: number;
  unreadMessages: number;
  unreadInbox: number;
  total: number;
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);

  // Poll notifications every 30s for at-a-glance badges
  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const r = await fetch("/api/admin/notifications", { cache: "no-store" });
        if (r.ok && !cancelled) setCounts(await r.json());
      } catch { /* ignore */ }
    };
    fetchCounts();
    const t = setInterval(fetchCounts, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const logout = async () => {
    await fetch("/api/admin", { method: "DELETE" });
    router.replace("/admin/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const currentPage =
    navGroups.flatMap((g) => g.items).find((i) => isActive(i.href))?.label ?? "Admin";

  const badgeFor = (key: keyof Counts | undefined) => {
    if (!key || !counts) return 0;
    return counts[key] || 0;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-surface-200 bg-surface-0">
        <SidebarContent isActive={isActive} badgeFor={badgeFor} onNavigate={() => setSidebarOpen(false)} />
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
            <SidebarContent isActive={isActive} badgeFor={badgeFor} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-surface-200 bg-surface-0 px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-surface-600 hover:bg-surface-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-base font-semibold text-surface-900">{currentPage}</h1>
          </div>

          <div className="hidden md:flex flex-1 max-w-md ml-4">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="search"
                placeholder="Search sales, users, items…"
                aria-label="Search"
                className="input input-sm pl-9"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100"
            >
              <Building2 className="h-3.5 w-3.5" />
              View public site
            </Link>
            <Link
              href="/admin/seller-verifications"
              className="relative rounded-md p-2 text-surface-600 hover:bg-surface-100"
              aria-label="Notifications"
              title={counts?.sellerVerifications ? `${counts.sellerVerifications} pending seller verifications` : "No new notifications"}
            >
              <Bell className="h-5 w-5" />
              {!!counts && counts.sellerVerifications + counts.saleVerifications + counts.unreadInbox > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface-0">
                  {counts.sellerVerifications + counts.saleVerifications + counts.unreadInbox}
                </span>
              )}
            </Link>
          </div>
        </header>

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
  badgeFor,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  badgeFor: (key: keyof Counts | undefined) => number;
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
                const badge = badgeFor((item as { badgeKey?: keyof Counts }).badgeKey);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className="nav-link"
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
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
