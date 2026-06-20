import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  UserCircle2,
  BadgeCheck,
  MapPin,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-user";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/account",            label: "Dashboard",  icon: LayoutDashboard },
  { href: "/account/sales",      label: "My sales",   icon: Package },
  { href: "/account/messages",   label: "Messages",   icon: MessageSquare },
  { href: "/account/verify",     label: "Verification", icon: BadgeCheck },
  { href: "/account/profile",    label: "Profile",    icon: UserCircle2 },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-64 lg:shrink-0">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-surface-200 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-surface-900">{user.name}</p>
              <p className="truncate text-xs text-surface-500">{user.email}</p>
            </div>
            {user.verifiedSeller ? (
              <span className="badge badge-success whitespace-nowrap" title="Verified seller">
                <BadgeCheck className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="badge badge-warning whitespace-nowrap">Pending</span>
            )}
          </div>

          <nav className="p-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-surface-700 transition hover:bg-surface-50 hover:text-surface-900"
                >
                  <Icon className="h-4 w-4 text-surface-400" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <LogoutButton />
          </nav>
        </div>

        {user.city && (
          <p className="mt-3 px-3 text-xs text-surface-500">
            <MapPin className="mr-1 inline h-3 w-3" />
            {user.city}, {user.state} {user.zip}
          </p>
        )}
      </aside>

      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
