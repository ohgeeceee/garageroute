import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Bot (Scout) analytics — focused on conversation health + lead funnel.
 *
 * Returns:
 *  - totals: conversations, leads, messages, handoffs
 *  - series: conversations + messages per day for last 30 days
 *  - channels: breakdown by web vs messenger
 *  - modes: breakdown by marketing / support / handoff
 *  - tools: top 8 most-used tools (count, success rate)
 *  - topIntents: top 6 wishlist keywords from leads
 *  - funnel: conversations → leads → handoffs
 *  - notificationHealth: lead-notification log stats (sent / failed)
 *  - recent: latest 5 conversations
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalConversations,
    totalLeads,
    totalMessages,
    activeConversations,
    conversationsByChannel,
    conversationsByMode,
    leadsByStatus,
    recentConversations,
    messagesRecent,
    conversationsRecent,
    handoffCount,
    leadsForIntents,
    notificationsSent,
    notificationsQueued,
    notificationsFailed,
    toolRows,
  ] = await Promise.all([
    prisma.botConversation.count(),
    prisma.lead.count(),
    prisma.botMessage.count(),
    prisma.botConversation.count({
      where: { lastMessageAt: { gte: thirtyDaysAgo } },
    }),
    prisma.botConversation.groupBy({
      by: ["channel"],
      _count: { _all: true },
    }),
    prisma.botConversation.groupBy({
      by: ["mode"],
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.botConversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      include: {
        _count: { select: { messages: true, leads: true, actions: true } },
      },
    }),
    prisma.botMessage.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, role: true },
    }),
    prisma.botConversation.findMany({
      where: { lastMessageAt: { gte: thirtyDaysAgo } },
      select: { lastMessageAt: true },
    }),
    prisma.botConversation.count({ where: { mode: "handoff" } }),
    prisma.lead.findMany({
      select: { wishlist: true },
      take: 500,
    }),
    prisma.leadNotificationLog.count({ where: { status: "sent" } }),
    prisma.leadNotificationLog.count({ where: { status: "queued" } }),
    prisma.leadNotificationLog.count({ where: { status: "failed" } }),
    // Pull raw tool rows so we can compute success rate correctly.
    // (Groupby + _sum doesn't work on boolean fields in Prisma.)
    prisma.botAction.findMany({
      select: { toolName: true, success: true },
    }),
  ]);

  // 30-day daily series — conversations (active) + messages
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const activeConvos = conversationsRecent.filter(
      (r) => r.lastMessageAt.toISOString().slice(0, 10) === dateKey
    ).length;
    const msgCount = messagesRecent.filter(
      (r) => r.createdAt.toISOString().slice(0, 10) === dateKey
    ).length;
    return { date: dateKey, label, conversations: activeConvos, messages: msgCount };
  });

  // Top tools — count + success rate (computed from raw rows)
  const toolAgg = new Map<string, { calls: number; successes: number }>();
  for (const r of toolRows) {
    const cur = toolAgg.get(r.toolName) ?? { calls: 0, successes: 0 };
    cur.calls += 1;
    if (r.success) cur.successes += 1;
    toolAgg.set(r.toolName, cur);
  }
  const topTools = Array.from(toolAgg.entries())
    .map(([tool, v]) => ({
      tool,
      calls: v.calls,
      successRate: v.calls > 0 ? Math.round((v.successes / v.calls) * 100) : 0,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 8);

  // Top wishlist keywords
  const keywordCounts = new Map<string, number>();
  for (const lead of leadsForIntents) {
    let wishlist: string[] = [];
    try {
      wishlist = JSON.parse(lead.wishlist || "[]");
    } catch {
      wishlist = [];
    }
    for (const w of wishlist) {
      const key = w.trim().toLowerCase();
      if (key.length >= 3) {
        keywordCounts.set(key, (keywordCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const topIntents = Array.from(keywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Funnel
  const funnel = {
    conversations: totalConversations,
    activeConversations,
    leads: totalLeads,
    handoffs: handoffCount,
    leadConversionRate:
      totalConversations > 0
        ? Math.round((totalLeads / totalConversations) * 100)
        : 0,
    handoffRate:
      totalConversations > 0
        ? Math.round((handoffCount / totalConversations) * 100)
        : 0,
  };

  // Notification health
  const notificationHealth = {
    sent: notificationsSent,
    queued: notificationsQueued,
    failed: notificationsFailed,
    successRate:
      notificationsSent + notificationsFailed > 0
        ? Math.round(
            (notificationsSent / (notificationsSent + notificationsFailed)) * 100
          )
        : null,
  };

  return NextResponse.json({
    totals: {
      conversations: totalConversations,
      activeConversations,
      leads: totalLeads,
      messages: totalMessages,
      handoffs: handoffCount,
    },
    series,
    channels: conversationsByChannel
      .map((c) => ({ channel: c.channel, count: c._count._all }))
      .sort((a, b) => b.count - a.count),
    modes: conversationsByMode
      .map((m) => ({ mode: m.mode, count: m._count._all }))
      .sort((a, b) => b.count - a.count),
    leadsByStatus: leadsByStatus
      .map((l) => ({ status: l.status, count: l._count._all }))
      .sort((a, b) => b.count - a.count),
    topTools,
    topIntents,
    funnel,
    notificationHealth,
    recent: recentConversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      mode: c.mode,
      lastMessageAt: c.lastMessageAt,
      messageCount: c._count.messages,
      leadCount: c._count.leads,
      actionCount: c._count.actions,
      userId: c.userId,
    })),
    generatedAt: now.toISOString(),
  });
}
