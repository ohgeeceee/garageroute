"use client";

import { usePathname } from "next/navigation";
import { RouteProvider } from "@/context/RouteContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  verifiedSeller: boolean;
} | null;

/**
 * Global Providers.
 *
 * - Skips the public Navbar on /admin/* — the AdminShell renders full-viewport
 *   with its own sidebar + top bar.
 * - Skips the public Footer on /admin/* for the same reason.
 * - Otherwise wraps in RouteProvider (for the buyer route context) and renders
 *   the standard public chrome.
 */
export default function Providers({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <RouteProvider>{children}</RouteProvider>;
  }

  return (
    <RouteProvider>
      <Navbar user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </RouteProvider>
  );
}
