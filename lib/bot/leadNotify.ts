import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { savedSearchEmail } from "@/emails/saved-search";

/**
 * Notify buyers about a newly-posted sale.
 *
 * Three parallel paths:
 *  1. Alert subscribers — match by ZIP + (optional) category.
 *  2. Lead wishlist matches — match by keyword overlap with title/description/items.
 *  3. Saved searches — user- or email-bound SavedSearch rows with matching
 *     (zip + category + radius). Auth-optional: signed-in or anonymous.
 *
 * All paths:
 *  - Run fire-and-forget (never throw into the sale-creation flow)
 *  - Dedupe via a small log table (`LeadNotificationLog`) — at most one email per
 *    recipient per sale, even if multiple wishlist keywords match.
 *  - Respect `LEAD_NOTIFY_ENABLED` — set to "false" to silence the feature
 *    without unsetting email credentials.
 *  - Use the existing `sendEmail` pipeline so Resend, PendingEmail, and the
 *    admin EmailThread all stay in sync.
 */

export type NotifiableSale = {
  id: string;
  title: string;
  type: string;
  city: string;
  state: string;
  zip: string;
  dates: string;
  hours: string;
  description: string;
  itemNames: string[];
  itemCategories: string[];
  itemCount: number;
};

export type NotifySummary = {
  alertMatches: number;
  wishlistMatches: number;
  savedSearchMatches: number;
  emailsSent: number;
  emailsQueued: number;
  skipped: number;
};

export function isNotifyEnabled(): boolean {
  if (process.env.LEAD_NOTIFY_ENABLED === "false") return false;
  return true;
}

function publicUrl(sale: { id: string }): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/sales/${sale.id}`;
}

/**
 * Build the email body for a buyer. Single template, parameterized.
 */
function buildBuyerEmail(args: {
  sale: NotifiableSale;
  matchedOn: string[]; // human-readable reasons: ["ZIP 80202", "wishlist: vintage camera"]
  recipient: "alert" | "lead";
}): { subject: string; text: string } {
  const { sale, matchedOn, recipient } = args;
  const reasonLine =
    matchedOn.length > 0
      ? `Matched on: ${matchedOn.join(", ")}`
      : recipient === "alert"
        ? `New sale near ${sale.zip}`
        : "New sale matching your interests";

  const subject = `New ${sale.type || "garage sale"} near you — ${sale.title}`;
  const lines: string[] = [];
  lines.push(`Hi! A new sale just got posted on GarageRoute.`);
  lines.push("");
  lines.push(`${sale.title}`);
  lines.push(`${sale.city}, ${sale.state} ${sale.zip}`);
  lines.push(`${sale.dates} · ${sale.hours}`);
  if (sale.itemCount > 0) {
    const sample = sale.itemNames.slice(0, 5).join(", ");
    const more = sale.itemCount > 5 ? ` (+${sale.itemCount - 5} more)` : "";
    lines.push(`${sale.itemCount} item${sale.itemCount === 1 ? "" : "s"}${sample ? `: ${sample}${more}` : ""}`);
  }
  if (sale.description && sale.description.trim()) {
    const trimmed = sale.description.trim();
    lines.push("");
    lines.push(trimmed.length > 320 ? trimmed.slice(0, 317) + "..." : trimmed);
  }
  lines.push("");
  lines.push(`View sale → ${publicUrl(sale)}`);
  lines.push("");
  lines.push(reasonLine);
  lines.push("");
  lines.push(
    recipient === "lead"
      ? "You're getting this because you told Scout what you're hunting for. Reply STOP to opt out of wishlist alerts."
      : "You're getting this because you signed up for alerts in this area. Manage alerts: https://garageroute.com"
  );
  return { subject, text: lines.join("\n") };
}

/**
 * Dedupe + claim a notification slot for a recipient.
 *
 * One recipient = at most ONE notification per sale, regardless of how many
 * match reasons apply (alert ZIP + wishlist keyword, etc.). When a second match
 * comes in, we merge the reasons into the existing row (for admin audit) and
 * skip sending a duplicate email.
 *
 * Returns:
 *  - { claimed: true }  — fresh slot, caller should send the email
 *  - { claimed: false, merged: true } — row already existed (in any status);
 *    matchedOn was merged in, no second email sent
 *  - { claimed: false, merged: false } — race / weird state, do nothing
 */
async function claimNotification(args: {
  saleId: string;
  recipientEmail: string;
  recipientType: "alert" | "lead" | "saved_search";
  matchedOn: string[];
}): Promise<{ claimed: boolean; merged: boolean }> {
  // Look across ALL recipient types for this (sale, email) — the schema's
  // unique constraint is (saleId, recipientEmail, recipientType) which lets
  // a recipient be claimed once as "alert" AND once as "lead". We enforce a
  // stricter "one notification per recipient per sale" rule here.
  const existing = await prisma.leadNotificationLog.findFirst({
    where: {
      saleId: args.saleId,
      recipientEmail: args.recipientEmail,
    },
  });

  if (existing) {
    // Always merge matchedOn + recipientType for audit completeness, even if
    // the row is already in a terminal state. This way the admin sees ALL the
    // reasons this recipient matched, not just the first one.
    try {
      const existingOn = JSON.parse(existing.matchedOn || "[]") as string[];
      const merged = Array.from(new Set([...existingOn, ...args.matchedOn]));
      // Prefer "lead" as the recipientType when wishlist context applies — it
      // carries richer info for the admin audit.
      const newType =
        existing.recipientType === "lead" || args.recipientType === "lead"
          ? "lead"
          : existing.recipientType;
      await prisma.leadNotificationLog.update({
        where: { id: existing.id },
        data: {
          recipientType: newType,
          matchedOn: JSON.stringify(merged),
        },
      });
    } catch {
      // best-effort merge
    }
    // Already-claimed slot — never re-send the email.
    return { claimed: false, merged: true };
  }

  // No existing row — insert fresh.
  try {
    await prisma.leadNotificationLog.create({
      data: {
        saleId: args.saleId,
        recipientEmail: args.recipientEmail,
        recipientType: args.recipientType,
        matchedOn: JSON.stringify(args.matchedOn),
        status: "pending",
      },
    });
    return { claimed: true, merged: false };
  } catch (err) {
    // Race condition: another caller inserted between our check and our write.
    // Treat as "already exists" — bail safely.
    return { claimed: false, merged: false };
  }
}

async function markNotificationStatus(
  saleId: string,
  recipientEmail: string,
  recipientType: "alert" | "lead" | "saved_search",
  status: "sent" | "queued" | "failed",
  error = ""
): Promise<void> {
  await prisma.leadNotificationLog
    .updateMany({
      where: { saleId, recipientEmail, recipientType },
      data: { status, error, sentAt: status === "sent" ? new Date() : null },
    })
    .catch(() => undefined);
}

/**
 * Match a sale's text against a list of keywords (case-insensitive contains).
 */
function matchKeywords(haystack: string, keywords: string[]): string[] {
  const h = haystack.toLowerCase();
  const hits: string[] = [];
  for (const k of keywords) {
    const trimmed = k.trim().toLowerCase();
    if (!trimmed) continue;
    // Word-ish match: at least 3 chars, contains, and not too greedy
    if (trimmed.length >= 3 && h.includes(trimmed)) {
      hits.push(k);
    }
  }
  return hits;
}

/**
 * Find alert subscribers for a sale — same ZIP, category match (if set).
 * Coarse ZIP match (string equality) keeps things fast; refine later if needed.
 */
async function findAlertMatches(sale: NotifiableSale): Promise<{ email: string; zip: string }[]> {
  // We only filter by ZIP in SQL; category is enforced after.
  const alerts = await prisma.alert.findMany({
    where: { zip: sale.zip },
    select: { email: true, zip: true, category: true },
  });
  return alerts
    .filter((a) => {
      if (!a.category || a.category.trim() === "") return true;
      // a.category is a comma list of categories
      const cats = a.category
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);
      if (cats.length === 0) return true;
      return sale.itemCategories.some((c) => cats.includes(c.toLowerCase()));
    })
    .map((a) => ({ email: a.email, zip: a.zip }));
}

/**
 * Find leads whose wishlist matches the sale (text overlap).
 */
async function findWishlistMatches(sale: NotifiableSale): Promise<{ email: string; matched: string[] }[]> {
  // Pull leads with a non-empty wishlist. Skip ones without zip when sale has zip
  // (we'd ideally do distance, but no lead geo yet — pure text match for v1).
  const leads = await prisma.lead.findMany({
    where: {
      wishlist: { not: "[]" },
    },
    select: { email: true, wishlist: true, zip: true },
    take: 500, // safety cap; revisit if leads list grows
  });

  const haystack = [
    sale.title,
    sale.description,
    ...sale.itemNames,
  ].join(" \n ");

  const matches: { email: string; matched: string[] }[] = [];
  for (const lead of leads) {
    let wishlist: string[] = [];
    try {
      wishlist = JSON.parse(lead.wishlist || "[]");
    } catch {
      wishlist = [];
    }
    if (wishlist.length === 0) continue;
    const hits = matchKeywords(haystack, wishlist);
    if (hits.length > 0) {
      matches.push({ email: lead.email, matched: hits });
    }
  }
  return matches;
}

/**
 * Find SavedSearch rows that match the sale.
 *
 * Matching rules:
 *   - zip matches the sale's zip exactly (radius is aspirational — we don't
 *     geocode every search; refine to distance in a follow-up).
 *   - if category is set on the search, at least one item in the sale has
 *     that category.
 *
 * Returns the search tuple alongside the matched email so the email body
 * can tell the recipient why they were alerted.
 */
async function findSavedSearchMatches(
  sale: NotifiableSale,
): Promise<{ email: string; zip: string; category: string; radius: number }[]> {
  if (!sale.zip) return [];
  const searches = await prisma.savedSearch.findMany({
    where: { zip: sale.zip, active: true },
    select: { email: true, zip: true, category: true, radius: true },
    take: 500,
  });

  return searches.filter((s) => {
    if (!s.category || s.category.trim() === "") return true;
    const wanted = s.category.trim().toLowerCase();
    return sale.itemCategories.some((c) => c.toLowerCase() === wanted);
  });
}

/**
 * Fire-and-forget wrapper used by the sale-creation route.
 */
export function notifyMatchingBuyersAsync(sale: NotifiableSale): void {
  // Don't await — let the API response return immediately.
  notifyMatchingBuyers(sale).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[scout:lead-notify] crashed:", err);
  });
}

export async function notifyMatchingBuyers(sale: NotifiableSale): Promise<NotifySummary> {
  const summary: NotifySummary = {
    alertMatches: 0,
    wishlistMatches: 0,
    savedSearchMatches: 0,
    emailsSent: 0,
    emailsQueued: 0,
    skipped: 0,
  };

  if (!isNotifyEnabled()) {
    return summary;
  }

  // Alerts (ZIP/category match)
  let alerts: { email: string; zip: string }[] = [];
  try {
    alerts = await findAlertMatches(sale);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scout:lead-notify] findAlertMatches failed:", err);
  }

  // Wishlist (keyword match)
  let wishlists: { email: string; matched: string[] }[] = [];
  try {
    wishlists = await findWishlistMatches(sale);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scout:lead-notify] findWishlistMatches failed:", err);
  }

  // Saved searches (user/email-bound searches)
  let savedSearches: { email: string; zip: string; category: string; radius: number }[] = [];
  try {
    savedSearches = await findSavedSearchMatches(sale);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scout:lead-notify] findSavedSearchMatches failed:", err);
  }

  summary.alertMatches = alerts.length;
  summary.wishlistMatches = wishlists.length;
  summary.savedSearchMatches = savedSearches.length;

  // Send alert emails
  for (const alert of alerts) {
    const claim = await claimNotification({
      saleId: sale.id,
      recipientEmail: alert.email,
      recipientType: "alert",
      matchedOn: [`ZIP ${alert.zip}`],
    });
    if (!claim.claimed) {
      summary.skipped++;
      continue;
    }
    const { subject, text } = buildBuyerEmail({
      sale,
      matchedOn: [`ZIP ${alert.zip}`],
      recipient: "alert",
    });
    const result = await sendEmail({
      to: alert.email,
      subject,
      body: text,
      kind: "lead_welcome", // reusing existing kind
      metadata: { kind: "alert", saleId: sale.id, zip: alert.zip },
    });
    if (result.ok) {
      summary.emailsSent++;
      await markNotificationStatus(sale.id, alert.email, "alert", "sent");
    } else if (result.skipped) {
      summary.emailsQueued++;
      await markNotificationStatus(sale.id, alert.email, "alert", "queued", result.error || "");
    } else {
      await markNotificationStatus(sale.id, alert.email, "alert", "failed", result.error || "send_failed");
    }
  }

  // Send wishlist emails — claimNotification dedupes across alert+lead for the
  // same recipient, so a subscriber who is also a wishlist lead only gets one email.
  for (const w of wishlists) {
    const claim = await claimNotification({
      saleId: sale.id,
      recipientEmail: w.email,
      recipientType: "lead",
      matchedOn: w.matched.map((m) => `wishlist: ${m}`),
    });
    if (!claim.claimed) {
      // Either already sent (alert path), or merged into an existing pending log row.
      summary.skipped++;
      continue;
    }
    const { subject, text } = buildBuyerEmail({
      sale,
      matchedOn: w.matched.map((m) => `wishlist: ${m}`),
      recipient: "lead",
    });
    const result = await sendEmail({
      to: w.email,
      subject,
      body: text,
      kind: "lead_welcome",
      metadata: { kind: "wishlist", saleId: sale.id, matched: w.matched },
    });
    if (result.ok) {
      summary.emailsSent++;
      await markNotificationStatus(sale.id, w.email, "lead", "sent");
    } else if (result.skipped) {
      summary.emailsQueued++;
      await markNotificationStatus(sale.id, w.email, "lead", "queued", result.error || "");
    } else {
      await markNotificationStatus(sale.id, w.email, "lead", "failed", result.error || "send_failed");
    }
  }

  // Saved-search alerts — use the dedicated savedSearchEmail template.
  // claimNotification dedupes against alert+lead, so a recipient who is
  // subscribed via AlertSignup AND via /api/alerts/save still gets one email.
  for (const s of savedSearches) {
    const matchedOn: string[] = [`ZIP ${s.zip}`];
    if (s.category) matchedOn.push(`category: ${s.category}`);

    const claim = await claimNotification({
      saleId: sale.id,
      recipientEmail: s.email,
      recipientType: "saved_search",
      matchedOn,
    });
    if (!claim.claimed) {
      summary.skipped++;
      continue;
    }

    const rendered = savedSearchEmail({
      sale: {
        id: sale.id,
        title: sale.title,
        type: sale.type,
        city: sale.city,
        state: sale.state,
        zip: sale.zip,
        dates: sale.dates,
        hours: sale.hours,
        description: sale.description,
        itemNames: sale.itemNames,
        itemCount: sale.itemCount,
      },
      matchedOn,
      search: { zip: s.zip, category: s.category, radius: s.radius },
    });

    const result = await sendEmail({
      to: s.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      kind: "saved_search",
      metadata: {
        saleId: sale.id,
        zip: s.zip,
        category: s.category,
        radius: s.radius,
      },
    });
    if (result.ok) {
      summary.emailsSent++;
      await markNotificationStatus(sale.id, s.email, "saved_search", "sent");
    } else if (result.skipped) {
      summary.emailsQueued++;
      await markNotificationStatus(sale.id, s.email, "saved_search", "queued", result.error || "");
    } else {
      await markNotificationStatus(sale.id, s.email, "saved_search", "failed", result.error || "send_failed");
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[scout:lead-notify] sale=${sale.id} alerts=${summary.alertMatches} wishlist=${summary.wishlistMatches} saved=${summary.savedSearchMatches} sent=${summary.emailsSent} queued=${summary.emailsQueued} skipped=${summary.skipped}`
  );

  return summary;
}
