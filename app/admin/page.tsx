"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-zinc-500">Redirecting…</p>
    </div>
  );
}