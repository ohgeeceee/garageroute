import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { fetchSale } from "@/lib/api";
import {
  saleJsonLd,
  breadcrumbJsonLd,
} from "@/lib/structured-data";
import ItemCard from "@/components/ItemCard";
import AddToRouteButton from "@/components/AddToRouteButton";
import DynamicMap from "@/components/DynamicMap";
import QueueJoinForm from "@/components/QueueJoinForm";
import ShareButtons from "@/components/ShareButtons";
import MessageForm from "@/components/MessageForm";
import SafeSpots from "@/components/SafeSpots";
import ReservationForm from "@/components/ReservationForm";
import ReportSaleButton from "@/components/ReportSaleButton";

type SaleWithStatus = Awaited<ReturnType<typeof fetchSale>> & {
  status?: string;
  statusNote?: string;
};

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sale = await fetchSale(id).catch(() => null);
  if (!sale) return { robots: { index: false, follow: true } };

  const title = `${sale.title} — Garage Sale in ${sale.city}, ${sale.state}`;
  const description = `${sale.type} on ${sale.dates}. ${sale.items.length} items listed at ${sale.address}, ${sale.city}.`;
  const canonical = `https://garageroute.com/sales/${sale.id}`;
  const ogImage = sale.photos?.[0] ?? undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: "GarageRoute",
      ...(ogImage ? { images: [{ url: ogImage, alt: sale.title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let sale: SaleWithStatus;
  try {
    sale = (await fetchSale(id)) as SaleWithStatus;
  } catch {
    notFound();
  }

  const status = sale.status || "active";
  const isClosed = status === "cancelled" || status === "ended";
  const note = sale.statusNote?.trim();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Script
        id={`sale-jsonld-${sale.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(saleJsonLd(sale)) }}
      />
      <Script
        id={`sale-breadcrumb-${sale.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: "https://garageroute.com" },
              { name: "Browse sales", url: "https://garageroute.com/sales" },
              {
                name: `${sale.city}, ${sale.state}`,
                url: `https://garageroute.com/sales?city=${encodeURIComponent(sale.city)}&state=${encodeURIComponent(sale.state)}`,
              },
              { name: sale.title, url: `https://garageroute.com/sales/${sale.id}` },
            ])
          ),
        }}
      />
      <Link
        href="/sales"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sales
      </Link>

      {isClosed && (
        <div
          role="status"
          className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${
            status === "cancelled"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-zinc-200 bg-zinc-50 text-zinc-800"
          }`}
        >
          {status === "cancelled" ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
          )}
          <div>
            <p className="font-semibold">
              {status === "cancelled"
                ? "This sale has been cancelled."
                : "This sale has ended."}
            </p>
            {note && <p className="mt-1 text-sm opacity-90">{note}</p>}
          </div>
        </div>
      )}

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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ShareButtons sale={sale} />
            <ReportSaleButton saleId={sale.id} />
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
            <QueueJoinForm saleId={sale.id} disabled={isClosed} />
          </div>

          <div className="mt-8">
            <MessageForm saleId={sale.id} />
          </div>

          <div className="mt-8">
            <ReservationForm
              saleId={sale.id}
              items={sale.items}
              disabled={isClosed}
            />
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
              <div
                key={idx}
                className="relative h-32 w-full overflow-hidden rounded-lg bg-surface-100"
              >
                <Image
                  src={photo}
                  alt={`${sale.title} photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 1024px) 50vw, 210px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
