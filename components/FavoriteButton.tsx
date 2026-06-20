"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  saleId: string;
  initialFavorited: boolean;
  loggedIn: boolean;
  size?: "sm" | "md";
};

export default function FavoriteButton({ saleId, initialFavorited, loggedIn, size = "md" }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent("/sales")}`);
      return;
    }
    setBusy(true);
    // Optimistic toggle.
    const next = !favorited;
    setFavorited(next);
    try {
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ saleId }),
          })
        : await fetch(`/api/favorites/${saleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Toggle failed");
    } catch (err) {
      // Revert on failure.
      setFavorited(!next);
      console.error("Favorite toggle failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from saved sales" : "Save this sale"}
      className={`inline-flex items-center justify-center rounded-full p-1.5 transition ${
        favorited
          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "text-zinc-400 hover:bg-zinc-100 hover:text-rose-500"
      } disabled:opacity-50`}
    >
      <Heart
        className={dim}
        fill={favorited ? "currentColor" : "none"}
        strokeWidth={2}
      />
    </button>
  );
}