"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      className="mt-2 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-surface-700 transition hover:bg-surface-50 hover:text-surface-900"
    >
      <LogOut className="h-4 w-4 text-surface-400" aria-hidden="true" />
      Sign out
    </button>
  );
}
