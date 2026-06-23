import { MapPin, ShoppingBag, Users } from "lucide-react";

type Props = {
  slug: string;
  name: string;
  abbreviation: string;
  tagline: string;
  saleCount: number;
  sellerCount: number;
  status: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="badge badge-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success-600 inline-block" />
        Live
      </span>
    );
  }
  if (status === "seeding") {
    return (
      <span className="badge badge-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning-500 inline-block" />
        Seeding
      </span>
    );
  }
  return (
    <span className="badge badge-neutral">
      <span className="h-1.5 w-1.5 rounded-full bg-surface-400 inline-block" />
      Coming soon
    </span>
  );
}

export default function StateCard({
  slug,
  name,
  abbreviation,
  tagline,
  saleCount,
  sellerCount,
  status,
}: Props) {
  const isLive = status === "live";

  return (
    <article className="card card-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-surface-900">{name}</h3>
          <span className="text-xs font-medium text-surface-500">{abbreviation}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {tagline && (
        <p className="mt-2 flex-1 text-sm text-surface-600 leading-relaxed">{tagline}</p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-surface-500">
        {isLive && (
          <>
            <span className="flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              {saleCount.toLocaleString()} sales
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {sellerCount.toLocaleString()} sellers
            </span>
          </>
        )}
        {!isLive && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Expanding soon
          </span>
        )}
      </div>

      <div className="mt-4">
        {isLive ? (
          <a
            href={`https://${slug}.garageroute.com/sales`}
            className="btn btn-primary btn-sm w-full"
          >
            Browse {name} sales
          </a>
        ) : (
          <a href={`/states/${slug}`} className="btn btn-secondary btn-sm w-full">
            Learn more
          </a>
        )}
      </div>
    </article>
  );
}
