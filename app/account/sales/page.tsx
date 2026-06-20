import Link from "next/link";
import { PlusCircle, Package, Inbox, ArrowRight, ShieldCheck, Clock, MapPin, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";

export default async function AccountSalesPage() {
  const user = await requireUser();
  const rows = await prisma.sale.findMany({
    where: { sellerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      city: true,
      state: true,
      zip: true,
      dates: true,
      type: true,
      verified: true,
      sellerToken: true,
      createdAt: true,
      _count: { select: { items: true, queues: true, messages: true, reservations: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Listings</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">My sales</h1>
          <p className="mt-1 text-sm text-surface-600">
            {rows.length} {rows.length === 1 ? "sale" : "sales"} on GarageRoute.
          </p>
        </div>
        {user.verifiedSeller ? (
          <Link href="/account/sales/new" className="btn btn-primary">
            <PlusCircle className="h-4 w-4" />
            Post a sale
          </Link>
        ) : (
          <Link href="/account/verify" className="btn btn-secondary">
            <ShieldCheck className="h-4 w-4" />
            Get verified to post
          </Link>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <Inbox className="h-10 w-10 text-surface-300" />
          <h3 className="mt-3 text-sm font-semibold text-surface-900">No sales yet</h3>
          <p className="mt-1 max-w-sm text-sm text-surface-500">
            {user.verifiedSeller
              ? "Post your first sale and buyers in your area will find it."
              : "Get verified first, then post your first sale."}
          </p>
          {user.verifiedSeller && (
            <Link href="/account/sales/new" className="btn btn-primary mt-5">
              <PlusCircle className="h-4 w-4" />
              Post your first sale
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Location</th>
                  <th>Dates</th>
                  <th className="text-center">Items</th>
                  <th className="text-center">Messages</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={`/account/sales/${s.id}`}
                        className="font-semibold text-surface-900 hover:text-brand-700"
                      >
                        {s.title}
                      </Link>
                      <div className="text-xs text-surface-500">{s.type}</div>
                    </td>
                    <td className="text-surface-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-surface-400" />
                        {s.city}, {s.state} {s.zip}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-surface-700">{s.dates || "—"}</td>
                    <td className="text-center font-semibold text-surface-800">{s._count.items}</td>
                    <td className="text-center text-surface-600">{s._count.messages + s._count.queues + s._count.reservations}</td>
                    <td>
                      {s.verified ? (
                        <span className="badge badge-success"><ShieldCheck className="h-3 w-3" /> Verified</span>
                      ) : (
                        <span className="badge badge-warning"><Clock className="h-3 w-3" /> Pending</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/account/sales/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Manage <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
