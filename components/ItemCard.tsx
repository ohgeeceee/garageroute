import { Item } from "@/data/sales";

export default function ItemCard({ item }: { item: Item }) {
  return (
    <div className="relative flex gap-4 rounded-lg border border-zinc-200 bg-white p-3 transition hover:shadow-sm">
      <img
        src={item.photo || "https://picsum.photos/200/200"}
        alt={item.name}
        className="h-20 w-20 rounded-md bg-zinc-100 object-cover"
      />
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
