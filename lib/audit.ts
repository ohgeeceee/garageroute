import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export type AuditAction =
  | "sale.verify"
  | "sale.unverify"
  | "sale.update"
  | "sale.delete"
  | "sale.bulk_verify"
  | "sale.create"
  | "user.view"
  | "user.signup"
  | "user.login"
  | "user.login_failed"
  | "user.logout"
  | "user.profile_update"
  | "user.password_change"
  | "user.password_reset_requested"
  | "user.password_reset_completed"
  | "user.verification_submitted"
  | "user.verify_seller"
  | "user.reject_seller"
  | "user.update"
  | "user.delete_soft"
  | "user.delete_hard"
  | "user.admin_reset_password"
  | "message.read"
  | "settings.update"
  | "admin.login"
  | "admin.logout";

export type AuditEntity = "sale" | "user" | "message" | "settings" | "system";

export interface AuditPayload {
  actor?: string;
  action: AuditAction;
  entity?: AuditEntity;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort audit log writer. Never throws into the calling request flow
 * — admin actions should not fail because logging failed.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    let ip = "";
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0].trim() ||
        h.get("x-real-ip") ||
        "";
    } catch {
      // headers() may throw outside a request context (e.g. scripts).
      ip = "";
    }
    await prisma.auditLog.create({
      data: {
        actor: payload.actor || "admin",
        action: payload.action,
        entity: payload.entity || "system",
        entityId: payload.entityId || "",
        metadata: JSON.stringify(payload.metadata || {}),
        ip,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write log entry:", err);
  }
}

/**
 * Format an audit metadata blob (JSON string in DB) into an object for display.
 */
export function parseAuditMetadata(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}