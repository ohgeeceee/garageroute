import "server-only";
import { botConfig } from "./config";
import { logAudit } from "@/lib/audit";

/**
 * Auto-post new sales to the GarageRoute Facebook Page.
 *
 * Called fire-and-forget from the sale-creation flow. Never throws into
 * the caller's request — failures are logged to AuditLog and stderr.
 *
 * Disabled when:
 *  - FB creds missing
 *  - FB_AUTO_POST_SALES != "true"
 *  - sale is not verified AND FB_AUTO_POST_ONLY_VERIFIED == "true"
 *
 * Toggle knobs live in `lib/bot/config.ts`.
 */

const FB_GRAPH = "https://graph.facebook.com/v21.0";

export type FbPostResult =
  | { ok: true; postId: string; url?: string }
  | { ok: false; reason: string; error?: string };

export type FbPostableSale = {
  id: string;
  title: string;
  city: string;
  state: string;
  zip: string;
  dates: string;
  hours: string;
  description?: string;
  verified?: boolean;
  items?: { name: string; price?: number | null }[];
  photos?: string[];
};

function publicUrl(sale: { id: string }): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/sales/${sale.id}`;
}

export function isAutoPostEnabled(): boolean {
  if (!botConfig.fb.pageId || !botConfig.fb.pageAccessToken) return false;
  return process.env.FB_AUTO_POST_SALES === "true";
}

export function formatSalePost(sale: FbPostableSale): string {
  const lines: string[] = [];
  lines.push(`🛍️ ${sale.title}`);
  lines.push("");
  lines.push(`📍 ${sale.city}${sale.state ? `, ${sale.state}` : ""}${sale.zip ? ` ${sale.zip}` : ""}`);
  lines.push(`📅 ${sale.dates}`);
  if (sale.hours) lines.push(`🕒 ${sale.hours}`);
  if (sale.verified) lines.push("✅ Verified seller");
  if (sale.description && sale.description.trim()) {
    const trimmed = sale.description.trim();
    if (trimmed.length > 280) {
      lines.push("");
      lines.push(trimmed.slice(0, 277) + "...");
    } else if (trimmed.length > 0) {
      lines.push("");
      lines.push(trimmed);
    }
  }
  const itemCount = sale.items?.length ?? 0;
  if (itemCount > 0) {
    lines.push("");
    lines.push(`${itemCount} item${itemCount === 1 ? "" : "s"} listed`);
  }
  lines.push("");
  lines.push(`View on GarageRoute → ${publicUrl(sale)}`);
  return lines.join("\n");
}

/**
 * Post a sale to the Facebook Page feed. Returns a structured result
 * without throwing — caller decides whether to surface it.
 */
export async function postSaleToFacebookPage(sale: FbPostableSale): Promise<FbPostResult> {
  if (!isAutoPostEnabled()) {
    return { ok: false, reason: "auto_post_disabled" };
  }

  const onlyVerified = process.env.FB_AUTO_POST_ONLY_VERIFIED === "true";
  if (onlyVerified && !sale.verified) {
    return { ok: false, reason: "not_verified" };
  }

  const message = formatSalePost(sale);
  const url = `${FB_GRAPH}/${encodeURIComponent(botConfig.fb.pageId)}/feed`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        link: publicUrl(sale),
        access_token: botConfig.fb.pageAccessToken,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; code?: number };
    };

    if (!res.ok || data.error || !data.id) {
      const errMsg = data.error?.message || `HTTP ${res.status}`;
      // eslint-disable-next-line no-console
      console.error("[scout:fb-post] failed:", errMsg, { saleId: sale.id });
      await logAudit({
        actor: "system",
        action: "sale.update", // re-using closest existing action
        entity: "sale",
        entityId: sale.id,
        metadata: { feature: "fb_auto_post", ok: false, error: errMsg },
      }).catch(() => undefined);
      return { ok: false, reason: "api_error", error: errMsg };
    }

    const postId = data.id;
    const postUrl = `https://facebook.com/${postId}`;
    // eslint-disable-next-line no-console
    console.log(`[scout:fb-post] posted sale ${sale.id} → ${postUrl}`);
    await logAudit({
      actor: "system",
      action: "sale.create",
      entity: "sale",
      entityId: sale.id,
      metadata: { feature: "fb_auto_post", ok: true, postId, url: postUrl },
    }).catch(() => undefined);

    return { ok: true, postId, url: postUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[scout:fb-post] exception:", msg, { saleId: sale.id });
    return { ok: false, reason: "exception", error: msg };
  }
}
