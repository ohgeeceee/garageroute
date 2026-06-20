"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Loader2,
  MessageCircle,
  Users,
  Mail,
  Hand,
  TrendingUp,
  Wrench,
  ListChecks,
  Send,
  AlertTriangle,
  Bot,
  Globe,
  LifeBuoy,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type BotAnalytics = {
  totals: {
    conversations: number;
    activeConversations: number;
    leads: number;
    messages: number;
    handoffs: number;
  };
  series: { date: string; label: string; conversations: number; messages: number }[];
  channels: { channel: string; count: number }[];
  modes: { mode: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  topTools: { tool: string; calls: number; successRate: number }[];
  topIntents: { keyword: string; count: number }[];
  funnel: {
    conversations: number;
    activeConversations: number;
    leads: number;
    handoffs: number;
    leadConversionRate: number;
    handoffRate: number;
  };
  notificationHealth: {
    sent: number;
    queued: number;
    failed: number;
    successRate: number | null;
  };
  recent: {
    id: string;
    channel: string;
    mode: string;
    lastMessageAt: string;
    messageCount: number;
    leadCount: number;
    actionCount: number;
  }[];
  generatedAt: string;
};

export default function BotAnalyticsPage() {
  const [data, setData] = useState<BotAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/bot-analytics")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/admin/login";
          return null;
        }
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card p-6 text-sm text-error-700 bg-error-50 border-error-100">
        Failed to load bot analytics.
      </div>
    );
  }

  const t = data.totals;
  const maxBar = Math.max(1, ...data.series.map((d) => Math.max(d.conversations, d.messages)));
  const maxTool = Math.max(1, ...data.topTools.map((t) => t.calls));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Insights</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-surface-900">
            Scout analytics
          </h2>
          <p className="mt-1 text-sm text-surface-600">
            Conversation health, lead funnel, and notification delivery — last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/conversations" className="btn btn-secondary btn-sm">
            <MessageCircle className="h-4 w-4" />
            Conversations
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Conversations" value={t.conversations} icon={MessageCircle} tone="brand" />
        <KPI
          label="Active (30d)"
          value={t.activeConversations}
          delta={t.messages}
          deltaLabel="messages exchanged"
          icon={TrendingUp}
          tone="info"
        />
        <KPI
          label="Leads captured"
          value={t.leads}
          delta={data.funnel.leadConversionRate}
          deltaLabel="of convos"
          icon={Users}
          tone="success"
        />
        <KPI
          label="Handoffs to human"
          value={t.handoffs}
          delta={data.funnel.handoffRate}
          deltaLabel="of convos"
          icon={Hand}
          tone="warning"
        />
      </div>

      {/* 30-day activity chart */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow">Activity</p>
            <h3 className="mt-0.5 text-base font-semibold text-surface-900">
              Conversations & messages per day — last 30 days
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-surface-500">
            <Legend dot="bg-brand-600" label="Convos" />
            <Legend dot="bg-info-500" label="Messages" />
          </div>
        </div>
        <div className="flex h-48 items-end gap-1">
          {data.series.map((d) => {
            const hConvo = Math.max(2, (d.conversations / maxBar) * 100);
            const hMsg = Math.max(2, (d.messages / maxBar) * 100);
            return (
              <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-0.5">
                <div className="relative flex w-full flex-col items-stretch justify-end" style={{ height: "100%" }}>
                  <div
                    className="w-full rounded-t-sm bg-info-500 transition-all group-hover:bg-info-600"
                    style={{ height: `${hMsg}%`, minHeight: 1 }}
                    title={`${d.label}: ${d.messages} messages`}
                  />
                  <div
                    className="w-full bg-brand-600 transition-all group-hover:bg-brand-700"
                    style={{ height: `${hConvo}%`, minHeight: 1 }}
                    title={`${d.label}: ${d.conversations} convos`}
                  />
                  {(d.conversations > 0 || d.messages > 0) && (
                    <div className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-surface-900 px-1.5 py-0.5 text-[9px] font-semibold text-white group-hover:block whitespace-nowrap">
                      {d.messages}m / {d.conversations}c
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-surface-500 font-medium">
          <span>{data.series[0]?.label}</span>
          <span>{data.series[Math.floor(data.series.length / 2)]?.label}</span>
          <span>{data.series[data.series.length - 1]?.label}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Funnel */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="eyebrow">Funnel</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">
                Conversation → lead
              </h3>
            </div>
            <Sparkles className="h-5 w-5 text-brand-500" />
          </div>
          <FunnelStep
            label="Conversations"
            value={data.funnel.conversations}
            icon={MessageCircle}
            tone="brand"
          />
          <FunnelConnector rate={data.funnel.leadConversionRate} label="captured a lead" />
          <FunnelStep
            label="Leads"
            value={data.funnel.leads}
            icon={Users}
            tone="success"
          />
          <FunnelConnector rate={data.funnel.handoffRate} label="needed a human" inverted />
          <FunnelStep
            label="Handoffs"
            value={data.funnel.handoffs}
            icon={Hand}
            tone="warning"
          />
        </section>

        {/* Channels + Modes */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Sources</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">
                Channels & modes
              </h3>
            </div>
            <Globe className="h-5 w-5 text-surface-400" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <SubPanel title="Channel">
              {data.channels.length === 0 ? (
                <Empty msg="No conversations yet." />
              ) : (
                <ul className="space-y-3">
                  {data.channels.map((c) => {
                    const pct = Math.round((c.count / Math.max(1, data.channels[0].count)) * 100);
                    const Icon = c.channel === "fb" ? MessageCircle : c.channel === "system" ? Wrench : Globe;
                    return (
                      <li key={c.channel}>
                        <div className="flex items-center justify-between mb-1 text-sm">
                          <span className="flex items-center gap-2 font-medium text-surface-800">
                            <Icon className="h-3.5 w-3.5 text-surface-500" />
                            {channelLabel(c.channel)}
                          </span>
                          <span className="text-xs font-semibold text-surface-500">{c.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-100">
                          <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SubPanel>
            <SubPanel title="Mode">
              {data.modes.length === 0 ? (
                <Empty msg="No conversations yet." />
              ) : (
                <ul className="space-y-3">
                  {data.modes.map((m) => {
                    const pct = Math.round((m.count / Math.max(1, data.modes[0].count)) * 100);
                    const Icon = m.mode === "handoff" ? Hand : m.mode === "support" ? LifeBuoy : Bot;
                    return (
                      <li key={m.mode}>
                        <div className="flex items-center justify-between mb-1 text-sm">
                          <span className="flex items-center gap-2 font-medium text-surface-800">
                            <Icon className="h-3.5 w-3.5 text-surface-500" />
                            {modeLabel(m.mode)}
                          </span>
                          <span className="text-xs font-semibold text-surface-500">{m.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-100">
                          <div
                            className={`h-full ${m.mode === "handoff" ? "bg-warning-500" : m.mode === "support" ? "bg-info-500" : "bg-brand-600"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SubPanel>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top tools */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Tool usage</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">
                What Scout actually does
              </h3>
            </div>
            <Wrench className="h-5 w-5 text-surface-400" />
          </div>
          {data.topTools.length === 0 ? (
            <Empty msg="No tool calls yet." />
          ) : (
            <ul className="space-y-3">
              {data.topTools.map((tool) => {
                const pct = Math.round((tool.calls / maxTool) * 100);
                const rateTone =
                  tool.successRate >= 90
                    ? "text-success-700"
                    : tool.successRate >= 70
                      ? "text-warning-700"
                      : "text-error-700";
                return (
                  <li key={tool.tool}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-medium text-surface-800">
                        <code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs">{tool.tool}</code>
                      </span>
                      <span className="text-xs">
                        <span className="font-semibold text-surface-700">{tool.calls}</span>
                        <span className="text-surface-400"> calls · </span>
                        <span className={`font-semibold ${rateTone}`}>{tool.successRate}% ok</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full bg-info-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top wishlist keywords */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Demand signals</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">
                Top wishlist keywords
              </h3>
            </div>
            <ListChecks className="h-5 w-5 text-surface-400" />
          </div>
          {data.topIntents.length === 0 ? (
            <Empty msg="Leads haven't told Scout what they want yet." />
          ) : (
            <ul className="space-y-2.5">
              {data.topIntents.map((intent) => {
                const pct = Math.round(
                  (intent.count / Math.max(1, data.topIntents[0].count)) * 100
                );
                return (
                  <li key={intent.keyword}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-surface-800 truncate">{intent.keyword}</span>
                      <span className="text-xs font-semibold text-surface-500">{intent.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full bg-success-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Notification health */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Buyer notifications</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">
                Auto-notify delivery health
              </h3>
              <p className="mt-1 text-xs text-surface-500">
                Alerts + wishlist match emails triggered when a new sale is posted.
              </p>
            </div>
            <Send className="h-5 w-5 text-surface-400" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Mini label="Sent" value={data.notificationHealth.sent} tone="success" />
            <Mini label="Queued" value={data.notificationHealth.queued} tone="info" />
            <Mini
              label="Failed"
              value={data.notificationHealth.failed}
              tone={data.notificationHealth.failed > 0 ? "warning" : "success"}
              icon={data.notificationHealth.failed > 0 ? AlertTriangle : undefined}
            />
            <Mini
              label="Success rate"
              value={
                data.notificationHealth.successRate === null
                  ? "—"
                  : `${data.notificationHealth.successRate}%`
              }
              tone={
                data.notificationHealth.successRate === null
                  ? "info"
                  : data.notificationHealth.successRate >= 90
                    ? "success"
                    : "warning"
              }
            />
          </div>
        </section>

        {/* Lead statuses */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Leads</p>
              <h3 className="mt-0.5 text-base font-semibold text-surface-900">By status</h3>
            </div>
            <Mail className="h-5 w-5 text-surface-400" />
          </div>
          {data.leadsByStatus.length === 0 ? (
            <Empty msg="No leads yet." />
          ) : (
            <ul className="space-y-3">
              {data.leadsByStatus.map((l) => {
                const pct = Math.round(
                  (l.count / Math.max(1, data.leadsByStatus.reduce((s, x) => s + x.count, 0))) * 100
                );
                return (
                  <li key={l.status}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-medium text-surface-800 capitalize">{l.status}</span>
                      <span className="text-xs font-semibold text-surface-500">{l.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Recent conversations */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between border-b border-surface-200 px-5 py-3">
          <div>
            <p className="eyebrow">Activity</p>
            <h3 className="mt-0.5 text-base font-semibold text-surface-900">Recent conversations</h3>
          </div>
          <Link href="/admin/conversations" className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
            All conversations <ArrowRight className="h-3 w-3" />
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Channel</th>
                <th>Mode</th>
                <th className="text-right">Messages</th>
                <th className="text-right">Leads</th>
                <th className="text-right">Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-surface-500 py-6">
                    No conversations yet.
                  </td>
                </tr>
              )}
              {data.recent.map((c) => (
                <tr key={c.id}>
                  <td className="text-surface-700 text-xs">
                    {relativeTime(c.lastMessageAt)}
                  </td>
                  <td>
                    <ChannelBadge channel={c.channel} />
                  </td>
                  <td>
                    <ModeBadge mode={c.mode} />
                  </td>
                  <td className="text-right text-surface-700">{c.messageCount}</td>
                  <td className="text-right text-surface-700">{c.leadCount}</td>
                  <td className="text-right text-surface-700">{c.actionCount}</td>
                  <td className="text-right">
                    <Link
                      href={`/admin/conversations/${c.id}`}
                      className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                      view →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-surface-400 text-right">
        Generated {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

/* ---------- Internal sub-components ---------- */

function KPI({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  delta?: number | string;
  deltaLabel?: string;
  icon: React.ElementType;
  tone: "brand" | "success" | "warning" | "info";
}) {
  const toneClasses: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    info: "bg-info-50 text-info-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-surface-900">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {deltaLabel && (
        <p className="mt-2 text-xs text-surface-500">
          {delta !== undefined && (
            <span className="font-semibold text-surface-700">{typeof delta === "number" ? delta.toLocaleString() : delta} </span>
          )}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "brand" | "success" | "warning";
}) {
  const toneClasses: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-200 p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-surface-500">{label}</p>
        <p className="text-lg font-bold text-surface-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function FunnelConnector({
  rate,
  label,
  inverted = false,
}: {
  rate: number;
  label: string;
  inverted?: boolean;
}) {
  const tone =
    inverted
      ? rate > 20
        ? "text-warning-700"
        : "text-surface-500"
      : rate > 30
        ? "text-success-700"
        : "text-surface-500";
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-xs">
      <ArrowRight className="h-3 w-3 text-surface-300" />
      <span className={`font-semibold ${tone}`}>{rate}%</span>
      <span className="text-surface-500">{label}</span>
    </div>
  );
}

function SubPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      {children}
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: "success" | "warning" | "info";
  icon?: React.ElementType;
}) {
  const toneClasses: Record<string, string> = {
    success: "text-success-700 bg-success-50",
    warning: "text-warning-700 bg-warning-50",
    info: "text-info-600 bg-info-50",
  };
  return (
    <div className="rounded-lg border border-surface-200 p-3">
      <p className="text-xs font-medium text-surface-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${toneClasses[tone].split(" ")[0]} flex items-center gap-1.5`}>
        {Icon && <Icon className="h-4 w-4" />}
        {value}
      </p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-surface-500">{msg}</p>;
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    web: "bg-blue-100 text-blue-700",
    fb: "bg-indigo-100 text-indigo-700",
    system: "bg-surface-100 text-surface-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[channel] ?? colors.system}`}>
      {channelLabel(channel)}
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[mode] ?? colors.marketing}`}>
      {modeLabel(mode)}
    </span>
  );
}

function channelLabel(c: string): string {
  if (c === "web") return "Web widget";
  if (c === "fb") return "Messenger";
  if (c === "system") return "System";
  return c;
}

function modeLabel(m: string): string {
  if (m === "marketing") return "Marketing";
  if (m === "support") return "Support";
  if (m === "handoff") return "Handoff";
  return m;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
