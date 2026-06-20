import Link from "next/link";
import { MessageSquare, Mail, Inbox, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";

export default async function AccountMessagesPage() {
  const user = await requireUser();
  const sales = await prisma.sale.findMany({
    where: { sellerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  const total = sales.reduce((n, s) => n + s.messages.length, 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Inbox</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">Messages</h1>
        <p className="mt-1 text-sm text-surface-600">
          {total} message{total === 1 ? "" : "s"} across your sales.
        </p>
      </header>

      {sales.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <Inbox className="h-10 w-10 text-surface-300" />
          <h3 className="mt-3 text-sm font-semibold text-surface-900">No sales yet</h3>
          <p className="mt-1 text-sm text-surface-500">Buyers will message you here once you post a sale.</p>
        </div>
      ) : total === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <MessageSquare className="h-10 w-10 text-surface-300" />
          <h3 className="mt-3 text-sm font-semibold text-surface-900">Inbox zero</h3>
          <p className="mt-1 text-sm text-surface-500">No buyer messages yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((s) =>
            s.messages.length === 0 ? null : (
              <section key={s.id} className="card overflow-hidden">
                <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
                  <Link href={`/account/sales/${s.id}`} className="text-sm font-semibold text-surface-900 hover:text-brand-700">
                    {s.title}
                  </Link>
                  <Link href={`/account/sales/${s.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
                    Open sale →
                  </Link>
                </header>
                <ul className="divide-y divide-surface-200">
                  {s.messages.map((m) => (
                    <li key={m.id} className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-semibold text-surface-900">{m.senderName}</span>{" "}
                            <span className="text-surface-500">({m.senderEmail})</span>
                          </p>
                          <p className="mt-1 line-clamp-3 text-sm text-surface-700">{m.content}</p>
                          <p className="mt-1 text-xs text-surface-500">{new Date(m.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
