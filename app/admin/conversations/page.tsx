import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Admin: list recent bot conversations.
 *
 * Shows: channel, mode, last message time, message count, lead count,
 * user email if linked.
 */

export default async function AdminConversationsPage() {
  if (!(await isAdmin())) redirect("/login?next=/admin/conversations");

  const conversations = await prisma.botConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      _count: { select: { messages: true, leads: true, actions: true } },
      user: { select: { email: true, name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Scout conversations</h1>
        <Link
          href="/admin"
          className="text-sm text-blue-600 hover:underline"
        >
          ← back to admin
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Messages</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Actions</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {conversations.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No conversations yet. Once users start chatting with Scout, they'll show up here.
                </td>
              </tr>
            )}
            {conversations.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                  {c.lastMessageAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <ChannelBadge channel={c.channel} />
                </td>
                <td className="px-4 py-3">
                  <ModeBadge mode={c.mode} />
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {c.user ? (
                    <span>{c.user.email}</span>
                  ) : (
                    <span className="text-zinc-400">anonymous</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700">{c._count.messages}</td>
                <td className="px-4 py-3 text-zinc-700">{c._count.leads}</td>
                <td className="px-4 py-3 text-zinc-700">{c._count.actions}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/conversations/${c.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    view
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    web: "bg-blue-100 text-blue-700",
    fb: "bg-indigo-100 text-indigo-700",
    system: "bg-zinc-100 text-zinc-700",
  };
  const labels: Record<string, string> = {
    web: "Web",
    fb: "Messenger",
    system: "System",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[channel] ?? "bg-zinc-100 text-zinc-700"}`}>
      {labels[channel] ?? channel}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const colors: Record<string, string> = {
    marketing: "bg-emerald-100 text-emerald-700",
    support: "bg-amber-100 text-amber-700",
    handoff: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[mode] ?? "bg-zinc-100 text-zinc-700"}`}>
      {mode}
    </span>
  );
}