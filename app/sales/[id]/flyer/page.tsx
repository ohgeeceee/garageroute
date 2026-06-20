import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MapPin, Calendar, Clock } from "lucide-react";
import { toDataURL } from "qrcode";
import PrintButton from "@/components/PrintButton";

interface Props {
  params: Promise<{ id: string }>;
}

function normalizeSale<T extends { photos: string | string[] }>(
  sale: T
): Omit<T, "photos"> & { photos: string[] } {
  return {
    ...sale,
    photos:
      typeof sale.photos === "string"
        ? JSON.parse(sale.photos || "[]")
        : sale.photos,
  };
}

export default async function FlyerPage({ params }: Props) {
  const { id } = await params;
  const raw = await prisma.sale.findUnique({
    where: { id },
    include: { items: { take: 8 } },
  });

  if (!raw) notFound();

  const sale = normalizeSale(raw);
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qr = await toDataURL(`${publicUrl}/sales/${sale.id}`, { width: 240 });

  return (
    <main className="min-h-screen bg-white p-8 print:p-0">
      <div className="mx-auto max-w-2xl rounded-2xl border-4 border-dashed border-zinc-300 p-8 text-center print:border-none">
        <h1 className="text-5xl font-black uppercase tracking-tight text-blue-700">
          Garage Sale
        </h1>
        <p className="mt-2 text-2xl font-semibold text-zinc-900">
          {sale.title}
        </p>

        <div className="mt-6 space-y-2 text-lg text-zinc-800">
          <p className="flex items-center justify-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {sale.address}, {sale.city} {sale.state} {sale.zip}
          </p>
          <p className="flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            {sale.dates}
          </p>
          <p className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            {sale.hours}
          </p>
        </div>

        {sale.items.length > 0 && (
          <div className="mt-8 text-left">
            <h2 className="text-center text-xl font-bold text-zinc-900">
              Featured items
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {sale.items.map((item: { id: string; name: string; price: number | null; condition: string }) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <span className="font-medium text-zinc-900">{item.name}</span>
                  {item.price ? (
                    <span className="ml-2 text-emerald-700">
                      ${item.price.toFixed(2)}
                    </span>
                  ) : null}
                  <span className="ml-2 text-sm text-zinc-500">
                    ({item.condition})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code to sale page" className="h-48 w-48" />
          <p className="mt-2 text-sm font-medium text-zinc-700">
            Scan for live inventory & directions
          </p>
          <p className="text-xs text-zinc-500">
            Powered by GarageRoute.com
          </p>
        </div>

        {sale.description && (
          <p className="mt-6 text-zinc-700">{sale.description}</p>
        )}
      </div>

      <div className="mt-8 flex justify-center print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}
