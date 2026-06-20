import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  ArrowLeft,
  QrCode,
  Edit3,
  Leaf,
} from "lucide-react";
import { fetchSale } from "@/lib/api";
import { saleJsonLd } from "@/lib/structured-data";
import ItemCard from "@/components/ItemCard";
import AddToRouteButton from "@/components/AddToRouteButton";
import DynamicMap from "@/components/DynamicMap";
import QueueJoinForm from "@/components/QueueJoinForm";
import ShareButtons from "@/components/ShareButtons";
import MessageForm from "@/components/MessageForm";
import SafeSpots from "@/components/SafeSpots";
import ReservationForm from "@/components/ReservationForm";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let sale;
  try {
    sale = await fetchSale(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Script
        id={`sale-jsonld-${sale.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(saleJsonLd(sale)) }}
      />
      <Link
        href="/sales"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sales
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,420px]">
        <div>
          <div className="flex flex-wrap items-start gap-3">
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
              {sale.type}
            </span>
            {sale.verified && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" />
                Verified seller
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-bold text-zinc-900">
            {sale.title}
          </h1>

          <div className="mt-4 space-y-2 text-zinc-600">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zinc-400" />
              {sale.address}, {sale.city}, {sale.state} {sale.zip}
            </p>
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-400" />
              {sale.dates}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              {sale.hours}
            </p>
          </div>

          <p className="mt-6 leading-relaxed text-zinc-700">
            {sale.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <AddToRouteButton sale={sale} />
            <span className="text-sm text-zinc-500">
              Hosted by {sale.seller}
            </span>
            {typeof sale.impactKg === "number" && sale.impactKg > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <Leaf className="h-3.5 w-3.5" />
                {sale.impactKg.toFixed(1)} kg diverted from landfill
              </span>
            )}
          </div>

          {sale.sellerToken && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/manage/${sale.sellerToken}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                <Edit3 className="h-4 w-4" />
                Manage inventory
              </Link>
              <Link
                href={`/sales/${sale.id}/flyer`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                <QrCode className="h-4 w-4" />
                Print flyer
              </Link>
            </div>
          )}

          <div className="mt-4">
            <ShareButtons sale={sale} />
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-bold text-zinc-900">
              Items at this sale
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sale.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div className="mt-8">
            <QueueJoinForm saleId={sale.id} />
          </div>

          <div className="mt-8">
            <MessageForm saleId={sale.id} />
          </div>

          <div className="mt-8">
            <ReservationForm saleId={sale.id} items={sale.items} />
          </div>

          <div className="mt-8">
            <SafeSpots lat={sale.lat} lng={sale.lng} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-[320px]">
            <DynamicMap sales={[sale]} className="h-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {sale.photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`${sale.title} photo ${idx + 1}`}
                className="h-32 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
