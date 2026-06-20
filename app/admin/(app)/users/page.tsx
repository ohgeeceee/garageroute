import Link from "next/link";
import { Search, Loader2, ShieldCheck, ShieldOff, Mail, UserCircle2, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const status = sp.status || "all";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name:  { contains: q } },
      { city:  { contains: q } },
    ];
  }
  if (status !== "all" && (status === "active" || status === "suspended" || status === "deleted")) {
    where.status = status;
  }

  const [rows, total, pendingVerifications] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        city: true,
        state: true,
        status: true,
        verifiedSeller: true,
        role: true,
        createdAt: true,
        _count: { select: { sessions: true, sales: true, verifications: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.userVerification.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Audience</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Users</h2>
          <p className="mt-1 text-sm text-surface-600">
            {total.toLocaleString()} {total === 1 ? "user" : "users"} ·{" "}
            <Link href="/admin/seller-verifications" className="font-semibold text-brand-700 hover:underline">
              {pendingVerifications} pending verification
              {pendingVerifications === 1 ? "" : "s"}
            </Link>
          </p>
        </div>
      </header>

      {/* Filters */}
      <form className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            name="q"
            placeholder="Search by name, email, or city…"
            defaultValue={q}
            aria-label="Search users"
            className="input input-sm pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-surface-200 bg-surface-0 p-0.5">
          {(["all", "active", "suspended", "deleted"] as const).map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              className={`rounded px-3 py-1 text-xs font-semibold capitalize transition ${
                status === s ? "bg-brand-600 text-white" : "text-surface-600 hover:bg-surface-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-surface-300" />
            <h3 className="mt-3 text-sm font-semibold text-surface-900">No users match</h3>
            <p className="mt-1 text-sm text-surface-500">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Seller</th>
                  <th className="text-center">Sales</th>
                  <th className="text-center">Sessions</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 font-semibold text-surface-900 hover:text-brand-700">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold uppercase">
                          {(u.name || u.email[0] || "?").slice(0, 2)}
                        </span>
                        <span>{u.name || "—"}</span>
                      </Link>
                    </td>
                    <td className="text-surface-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-surface-400" />
                        {u.email}
                      </span>
                    </td>
                    <td className="text-surface-700">
                      {u.city ? `${u.city}, ${u.state}` : "—"}
                    </td>
                    <td>
                      {u.status === "active" ? (
                        <span className="badge badge-success">Active</span>
                      ) : u.status === "suspended" ? (
                        <span className="badge badge-warning">Suspended</span>
                      ) : (
                        <span className="badge badge-neutral">Deleted</span>
                      )}
                    </td>
                    <td>
                      {u.verifiedSeller ? (
                        <span className="badge badge-success"><ShieldCheck className="h-3 w-3" /> Verified</span>
                      ) : (
                        <span className="badge badge-neutral">Unverified</span>
                      )}
                    </td>
                    <td className="text-center font-semibold text-surface-800">{u._count.sales}</td>
                    <td className="text-center text-surface-600">{u._count.sessions}</td>
                    <td className="whitespace-nowrap text-xs text-surface-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
