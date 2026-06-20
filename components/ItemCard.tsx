import Image from "next/image";
import { Item } from "@/data/sales";
import { placeholderDataUrl, isRemoteImageUrl } from "@/lib/image";

export default function ItemCard({ item }: { item: Item }) {
  const src = item.photo || "/placeholder-item.svg";
  const remote = isRemoteImageUrl(src);
  return (
    <div className="relative flex gap-4 rounded-lg border border-zinc-200 bg-white p-3 transition hover:shadow-sm">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100">
        <Image
          src={src}
          alt={item.name}
          fill
          sizes="80px"
          placeholder={remote ? "empty" : "blur"}
          blurDataURL={remote ? undefined : placeholderDataUrl(2, 2)}
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <p
          className={`font-medium ${
            item.sold ? "text-zinc-400 line-through" : "text-zinc-900"
          }`}
        >
          {item.name}
        </p>
        <p className="text-sm text-zinc-500">
          {item.category} · {item.condition}
        </p>
        {item.price !== undefined ? (
          <p
            className={`mt-1 font-semibold ${
              item.sold ? "text-zinc-400 line-through" : "text-emerald-700"
            }`}
          >
            ${item.price}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-400">Ask for price</p>
        )}
      </div>
      {item.sold && (
        <span className="absolute right-3 top-3 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-white">
          Sold
        </span>
      )}
    </div>
  );
}