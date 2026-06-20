import Link from "next/link";
import Image from "next/image";
import { MapPin, Calendar, Clock, CheckCircle, Sparkles } from "lucide-react";
import { Sale } from "@/data/sales";
import { formatDistance } from "@/lib/distance";
import { placeholderDataUrl, isRemoteImageUrl } from "@/lib/image";
import FavoriteButton from "@/components/FavoriteButton";

type Props = {
  sale: Sale;
  /** Set of saleIds the current user has favorited. */
  favoriteIds?: Set<string>;
  loggedIn?: boolean;
};

export default function SaleCard({ sale, favoriteIds, loggedIn = false }: Props) {
  const showVerified = sale.verified || sale.sellerVerifiedSeller;
  const isFavorited = favoriteIds ? favoriteIds.has(sale.id) : false;

  // Cover photo with safe fallback to a deterministic placeholder so next/image
  // never receives an empty src (which it rejects).
  const cover = sale.photos[0] || "/placeholder-sale.svg";
  const remote = isRemoteImageUrl(cover);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-44 bg-zinc-100">
        <Image
          src={cover}
          alt={sale.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          placeholder={remote ? "empty" : "blur"}
          blurDataURL={remote ? undefined : placeholderDataUrl(4, 3)}
          className="object-cover"
          // Below-the-fold; lazy by default in next/image.
        />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white">
          {sale.type}
        </span>
        {typeof sale.distanceMi === "number" && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-zinc-900/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {formatDistance(sale.distanceMi)}
          </span>
        )}
        <div className="absolute right-3 bottom-3">
          <FavoriteButton
            saleId={sale.id}
            initialFavorited={isFavorited}
            loggedIn={loggedIn}
            size="sm"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-blue-700">
            {sale.title}
          </h3>
        </div>

        <div className="mt-2 space-y-1 text-sm text-zinc-500">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" />
            {sale.address}, {sale.city}, {sale.state} {sale.zip}
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0" />
            {sale.dates}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0" />
            {sale.hours}
          </p>
        </div>

        {showVerified && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5" />
            Verified seller
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {sale.items.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
            >
              {item.name}
            </span>
          ))}
          {sale.items.length > 3 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              +{sale.items.length - 3} more
            </span>
          )}
        </div>

        <Link
          href={`/sales/${sale.id}`}
          className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          View sale & items →
        </Link>
      </div>
    </div>
  );
}