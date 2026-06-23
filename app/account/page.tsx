import Link from "next/link";
import Image from "next/image";
import {
  Package,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Heart,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";

export default async function AccountDashboardPage() {
  const user = await requireUser();

  const [sales, messageCount, pendingVerification, favorites] = await Promise.all([
    prisma.sale.findMany({
      where: { sellerUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        city: true,
        verified: true,
        createdAt: true,
        _count: { select: { items: true, messages: true, reservations: true } },
      },
    }),
    prisma.message.count({
      where: { sale: { sellerUserId: user.id } },
    }),
    prisma.userVerification.findFirst({
      where: { userId: user.id, status: "pending" },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        sale: {
          select: {
            id: true,
            title: true,
            type: true,
            city: true,
            state: true,
            dates: true,
            hours: true,
            photos: true,
          },
        },
      },
    }),
  ]);

  const totalSales = await prisma.sale.count({ where: { sellerUserId: user.id } });
  const verifiedSales = sales.filter((s) => s.verified).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-surface-600">
          Here&apos;s what&apos;s happening across your listings.
        </p>
      </header>

      {/* Verification callout */}
      {!user.verifiedSeller && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-warning-200 bg-warning-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-warning-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-warning-800">
                {pendingVerification ? "Verification in review" : "Become a verified seller"}
              </p>
              <p className="mt-0.5 text-xs text-warning-700">
                {pendingVerification
                  ? "Our team is reviewing your submission — typically within 24 hours."
                  : "Verified sellers can post sales and unlock the trusted badge."}
              </p>
            </div>
          </div>
          {!pendingVerification && (
            <Link href="/account/verify" className="btn btn-primary btn-sm">
              Submit verification
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total sales" value={totalSales.toString()} icon={Package} />
        <KPI label="Messages" value={messageCount.toString()} icon={MessageSquare} />
        <KPI label="Verified listings" value={`${verifiedSales}/${sales.length || 0}`} icon={ShieldCheck} tone="success" />
        <KPI label="Status" value={user.verifiedSeller ? "Verified" : "Pending"} icon={TrendingUp} tone={user.verifiedSeller ? "brand" : "info"} />
      </div>

      {/* Recent sales */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
          <div>
            <p className="eyebrow">Recent activity</p>
            <h3 className="mt-0.5 text-base font-semibold text-surface-900">Your latest sales</h3>
          </div>
          <Link href="/account/sales" className="btn btn-secondary btn-sm">
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Package className="h-10 w-10 text-surface-300" />
            <h3 className="mt-3 text-sm font-semibold text-surface-900">No sales yet</h3>
            <p className="mt-1 text-sm text-surface-500">
              {user.verifiedSeller
                ? "Post your first sale to get discovered by buyers nearby."
                : "Get verified first, then you can post sales."}
            </p>
            {user.verifiedSeller ? (
              <Link href="/account/sales/new" className="btn btn-primary btn-sm mt-4">
                <PlusCircle className="h-4 w-4" />
                Post a sale
              </Link>
            ) : (
              <Link href="/account/verify" className="btn btn-primary btn-sm mt-4">
                <ShieldCheck className="h-4 w-4" />
                Submit verification
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-surface-200">
            {sales.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/account/sales/${s.id}`}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-surface-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-surface-900">{s.title}</p>
                    <p className="mt-0.5 truncate text-xs text-surface-500">
                      {s.city} · {s._count.items} items · {s._count.messages} messages
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.verified ? (
                      <span className="badge badge-success"><ShieldCheck className="h-3 w-3" /> Verified</span>
                    ) : (
                      <span className="badge badge-warning">Pending</span>
                    )}
                    <span className="text-xs text-surface-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Saved sales (favorites) */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
          <div>
            <p className="eyebrow">Saved sales</p>
            <h3 className="mt-0.5 text-base font-semibold text-surface-900">
              Sales you&apos;ve favorited
            </h3>
          </div>
          <Link href="/sales" className="btn btn-secondary btn-sm">
            Browse sales
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Heart className="h-9 w-9 text-surface-300" />
            <h3 className="mt-3 text-sm font-semibold text-surface-900">No saved sales yet</h3>
            <p className="mt-1 max-w-md text-sm text-surface-500">
              Tap the heart on any sale to save it here. Saved sales are easy to revisit before the weekend.
            </p>
            <Link href="/sales" className="btn btn-primary btn-sm mt-4">
              Find sales near you
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-surface-200">
            {favorites.map((f) => {
              const photos = (() => {
                try {
                  return JSON.parse(f.sale.photos) as string[];
                } catch {
                  return [];
                }
              })();
              const photo = photos[0] || "https://picsum.photos/120/120";
              return (
                <li key={f.id}>
                  <Link
                    href={`/sales/${f.sale.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition hover:bg-surface-50"
                  >
                    <Image
                      src={photo}
                      alt=""
                      width={56}
                      height={56}
                      unoptimized
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-surface-900">
                        {f.sale.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-surface-500">
                        {f.sale.type} · {f.sale.city}, {f.sale.state} · {f.sale.dates}
                      </p>
                    </div>
                    <Heart
                      className="h-4 w-4 shrink-0 text-rose-500"
                      fill="currentColor"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "brand" | "success" | "info" | "neutral";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-700",
    info: "bg-info-50 text-info-600",
    neutral: "bg-surface-100 text-surface-700",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-surface-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
