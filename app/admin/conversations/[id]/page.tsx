import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Admin: view a single bot conversation + its tool calls + leads.
 */

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/login?next=/admin/conversations");
  const { id } = await params;

  const conversation = await prisma.botConversation.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      leads: true,
      actions: { orderBy: { createdAt: "asc" } },
      magicLinks: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!conversation) notFound();

  const messages = await prisma.botMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  const context = (() => {
    try {
      return JSON.parse(conversation.context || "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const metadata = (() => {
    try {
      return JSON.parse(conversation.metadata || "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  })();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conversation</h1>
          <p className="mt-1 text-sm text-zinc-600">
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{conversation.id}</code>
            <span className="ml-2">{conversation.channel}</span>
            <span className="ml-2">•</span>
            <span className="ml-2">mode: {conversation.mode}</span>
          </p>
        </div>
        <Link
          href="/admin/conversations"
          className="text-sm text-blue-600 hover:underline"
        >
          ← back
        </Link>
      </div>

      {/* User / metadata */}
      <section className="mb-6 rounded-lg bg-white p-4 shadow ring-1 ring-zinc-200">
        <h2 className="mb-2 text-sm font-semibold">Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs uppercase text-zinc-500">User</dt>
            <dd>{conversation.user?.email ?? <span className="text-zinc-400">anonymous ({conversation.externalId.slice(0, 16)}…)</span>}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Started</dt>
            <dd>{conversation.createdAt.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Last message</dt>
            <dd>{conversation.lastMessageAt.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Messages</dt>
            <dd>{messages.length}</dd>
          </div>
        </dl>
        {Object.keys(context).length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs uppercase text-zinc-500">Conversation context</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-2 text-xs">
              {JSON.stringify(context, null, 2)}
            </pre>
          </details>
        )}
        {Object.keys(metadata).length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs uppercase text-zinc-500">Metadata</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-2 text-xs">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </details>
        )}
      </section>

      {/* Leads captured */}
      {conversation.leads.length > 0 && (
        <section className="mb-6 rounded-lg bg-white p-4 shadow ring-1 ring-zinc-200">
          <h2 className="mb-2 text-sm font-semibold">Leads captured ({conversation.leads.length})</h2>
          <ul className="space-y-1 text-sm">
            {conversation.leads.map((l) => {
              const wishlist = (() => {
                try {
                  return JSON.parse(l.wishlist) as string[];
                } catch {
                  return [];
                }
              })();
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-emerald-50 px-2 py-1">
                  <span className="font-medium">{l.email}</span>
                  {l.zip && <span className="text-zinc-600">ZIP {l.zip}</span>}
                  {wishlist.length > 0 && <span className="text-zinc-600">wants: {wishlist.join(", ")}</span>}
                  <span className="ml-auto text-xs text-zinc-500">{l.createdAt.toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Messages */}
      <section className="mb-6 rounded-lg bg-white p-4 shadow ring-1 ring-zinc-200">
        <h2 className="mb-3 text-sm font-semibold">Transcript</h2>
        <div className="space-y-2 text-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded p-2 ${
                m.role === "user"
                  ? "bg-blue-50"
                  : m.role === "assistant"
                  ? "bg-zinc-50"
                  : m.role === "tool"
                  ? "bg-amber-50 font-mono text-xs"
                  : "bg-zinc-100"
              }`}
            >
              <div className="mb-0.5 text-xs uppercase text-zinc-500">
                {m.role}
                {m.toolName && <> · {m.toolName}</>}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tool actions */}
      {conversation.actions.length > 0 && (
        <section className="mb-6 rounded-lg bg-white p-4 shadow ring-1 ring-zinc-200">
          <h2 className="mb-3 text-sm font-semibold">Tool calls ({conversation.actions.length})</h2>
          <ul className="space-y-2">
            {conversation.actions.map((a) => (
              <li key={a.id} className="rounded bg-zinc-50 p-2 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono font-medium">{a.toolName}</span>
                  <span className={a.success ? "text-emerald-600" : "text-red-600"}>
                    {a.success ? "✓" : `✗ ${a.errorMessage}`}
                  </span>
                </div>
                <details>
                  <summary className="cursor-pointer text-zinc-500">args + result</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-white p-2">
{`args:\n${a.args}\n\nresult:\n${a.result}`}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}