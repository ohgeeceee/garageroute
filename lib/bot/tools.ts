import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { searchKb, formatKbHits } from "./kb";
import { findOrCreateLead, patchContext } from "./conversation";
import { issueMagicLink, resolveSupportUser } from "./magicLink";
import { sendEmail } from "@/lib/email";
import { hashPassword } from "@/lib/auth-user";
import { recordAction } from "./conversation";
import { randomBytes } from "node:crypto";

/**
 * Scout's tools. Every tool:
 *  - logs an action to BotAction (for audit + admin review)
 *  - returns a structured result (the LLM uses the result text)
 *  - never throws uncaught — errors are converted to a {ok:false} shape
 */

type ToolContext = {
  conversationId: string;
  mode: "marketing" | "support" | "handoff";
  userEmail?: string | null;
  hasSession: boolean;
  channel: "web" | "fb" | "system";
};

async function safeExecute<T extends Record<string, unknown>>(
  ctx: ToolContext,
  toolName: string,
  args: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T & { ok: boolean; error?: string }> {
  try {
    const result = await fn();
    await recordAction({
      conversationId: ctx.conversationId,
      toolName,
      args,
      result,
      success: true,
    });
    return { ...result, ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await recordAction({
      conversationId: ctx.conversationId,
      toolName,
      args,
      result: {},
      success: false,
      errorMessage: msg,
    });
    return { ok: false, error: msg } as T & { ok: boolean; error?: string };
  }
}

export function buildTools(ctx: ToolContext) {
  return {
    search_sales: tool({
      description:
        "Search GarageRoute sales by ZIP/category/keyword. Returns up to 8 matching sales with id, title, dates, hours, city, ZIP, and a 1-line summary. Use this whenever the user asks about finding or browsing sales.",
      inputSchema: z.object({
        zip: z.string().optional().describe("US ZIP code. Strongly preferred for accurate results."),
        category: z
          .string()
          .optional()
          .describe(
            "Item category keyword e.g. 'furniture', 'electronics', 'tools', 'vintage', 'kids'. Free-text — we'll match loosely."
          ),
        query: z.string().optional().describe("Free-text query against sale title/description/items."),
        radiusMiles: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("When ZIP is provided, search this radius around it. Defaults to 25."),
        limit: z.number().int().min(1).max(20).optional().describe("Max results. Default 8."),
      }),
      execute: async (input) =>
        safeExecute(ctx, "search_sales", input, async () => {
          const where: Record<string, unknown> = {};
          if (input.query) {
            where.OR = [
              { title: { contains: input.query } },
              { description: { contains: input.query } },
              { items: { some: { name: { contains: input.query } } } },
            ];
          }
          if (input.category) {
            where.items = { some: { category: { contains: input.category } } };
          }
          if (input.zip) {
            where.zip = input.zip;
          }
          const sales = await prisma.sale.findMany({
            where,
            include: { items: { take: 3, select: { name: true, price: true } } },
            orderBy: { createdAt: "desc" },
            take: input.limit ?? 8,
          });
          const results = sales.map((s) => ({
            id: s.id,
            title: s.title,
            dates: s.dates,
            hours: s.hours,
            city: s.city,
            state: s.state,
            zip: s.zip,
            verified: s.verified,
            itemCount: 0, // computed below
            sampleItems: s.items.map((i) => ({ name: i.name, price: i.price })),
            url: `/sales/${s.id}`,
            summary: `${s.title} in ${s.city}, ${s.state} — ${s.dates}. ${s.hours}.`,
          }));
          return { count: results.length, sales: results };
        }),
    }),

    get_sale_detail: tool({
      description:
        "Get full details for a single sale by id. Returns title, address, dates, hours, description, all items with name/category/price/condition, and the manage link for the seller.",
      inputSchema: z.object({
        saleId: z.string().describe("The sale id (from search_sales or a /sales/<id> URL)."),
      }),
      execute: async (input) =>
        safeExecute(ctx, "get_sale_detail", input, async () => {
          const sale = await prisma.sale.findUnique({
            where: { id: input.saleId },
            include: { items: true },
          });
          if (!sale) return { found: false };
          const photos =
            typeof sale.photos === "string" ? JSON.parse(sale.photos || "[]") : sale.photos;
          return {
            found: true,
            sale: {
              id: sale.id,
              title: sale.title,
              type: sale.type,
              address: sale.address,
              city: sale.city,
              state: sale.state,
              zip: sale.zip,
              dates: sale.dates,
              hours: sale.hours,
              description: sale.description,
              seller: sale.seller,
              verified: sale.verified,
              photos,
              items: sale.items.map((i) => ({
                id: i.id,
                name: i.name,
                category: i.category,
                price: i.price,
                condition: i.condition,
                sold: i.sold,
              })),
              url: `/sales/${sale.id}`,
            },
          };
        }),
    }),

    capture_lead: tool({
      description:
        "Save a lead: email is required, ZIP and wishlist are optional but encouraged. Use this whenever the user gives you their email, even if they didn't explicitly ask to be saved.",
      inputSchema: z.object({
        email: z.string().email().describe("User email address."),
        zip: z.string().optional().describe("US ZIP code, e.g. '80202'."),
        wishlist: z
          .array(z.string())
          .optional()
          .describe("Items they're looking for, e.g. ['vintage camera', 'mid-century chair']."),
      }),
      execute: async (input) =>
        safeExecute(ctx, "capture_lead", input, async () => {
          const lead = await findOrCreateLead({
            email: input.email,
            zip: input.zip,
            wishlist: input.wishlist,
            source: ctx.channel === "fb" ? "fb" : "web",
            conversationId: ctx.conversationId,
          });
          const conv = await patchContext(ctx.conversationId, {
            capturedEmails: Array.from(
              new Set([input.email.trim().toLowerCase()])
            ),
          });
          // Track last email for support auth fallback.
          await patchContext(ctx.conversationId, {
            lastEmail: input.email.trim().toLowerCase(),
          });
          return {
            created: lead.created,
            leadId: lead.id,
            message: lead.created
              ? "Lead saved. I'll let you know about new sales matching what you're looking for."
              : "You're already on the list — I've updated your wishlist.",
          };
        }),
    }),

    draft_listing: tool({
      description:
        "Start or update a draft sale listing for a seller. Asks for missing fields one at a time. When all fields are present, returns a draft preview the user can confirm. The bot never posts a sale without explicit user confirmation.",
      inputSchema: z.object({
        title: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        dates: z.string().optional().describe("Free-form dates like 'Sat Jun 28 - Sun Jun 29'."),
        hours: z.string().optional().describe("Free-form hours like '8am-2pm both days'."),
        description: z.string().optional(),
        items: z
          .array(
            z.object({
              name: z.string(),
              category: z.string().optional(),
              price: z.number().optional(),
            })
          )
          .optional(),
      }),
      execute: async (input) =>
        safeExecute(ctx, "draft_listing", input, async () => {
          const current = await patchContext(ctx.conversationId, {
            draftListing: {
              ...(input as unknown as Record<string, unknown>),
            } as never,
          });
          const d = current.draftListing ?? {};
          const required = ["title", "address", "city", "state", "zip", "dates", "hours", "description"] as const;
          const missing = required.filter((k) => !(d as Record<string, unknown>)[k]);
          const itemCount = d.items?.length ?? 0;

          if (missing.length > 0) {
            const askOrder: Record<string, string> = {
              title: "What should we call it? (e.g. 'Estate sale — moving after 25 years')",
              address: "What's the address? (street + city + state + ZIP — only the ZIP is shown publicly by default)",
              dates: "What dates? (e.g. 'Sat Jun 28 only' or 'Sat Jun 28 - Sun Jun 29')",
              hours: "What hours? (e.g. '8am-2pm both days')",
              description: "Quick description — 1-3 sentences on what's selling, parking, etc.",
            };
            const nextQuestion = askOrder[missing[0]];
            return {
              draftId: ctx.conversationId,
              missing: missing,
              nextQuestion,
              fields: d,
              ready: false,
            };
          }
          return {
            draftId: ctx.conversationId,
            missing: [],
            fields: d,
            itemCount,
            ready: true,
            preview: `${d.title}\n${d.address}, ${d.city}, ${d.state} ${d.zip}\n${d.dates}\n${d.hours}\n\n${d.description}\n\n${itemCount} item${itemCount === 1 ? "" : "s"} listed.`,
            nextStep:
              "When you're ready, I'll post this. Want to add items first, or post with what we have? (You can edit anything from your dashboard after posting.)",
          };
        }),
    }),

    faq_lookup: tool({
      description:
        "Search GarageRoute's knowledge base (AGENTS.md + FAQ) for how-to answers. Use this when the user asks how something works — posting a sale, reservations, refunds, account, mobile app, etc.",
      inputSchema: z.object({
        question: z.string().describe("The user's question, verbatim or rephrased."),
      }),
      execute: async (input) =>
        safeExecute(ctx, "faq_lookup", input, async () => {
          const hits = await searchKb(input.question, 3);
          return {
            found: hits.length > 0,
            answer: formatKbHits(hits),
            topHeading: hits[0]?.heading ?? null,
          };
        }),
    }),

    /* ---------- Support-mode tools ---------- */

    request_password_reset: tool({
      description:
        "Send a password reset link to the user's email. Use this when the user says they forgot their password. Returns ok regardless of whether the email exists, to avoid leaking account info.",
      inputSchema: z.object({
        email: z.string().email(),
      }),
      execute: async (input) =>
        safeExecute(ctx, "request_password_reset", input, async () => {
          const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
          if (!user) {
            return { sent: false, reason: "no_account" };
          }
          const token = randomBytes(32).toString("hex");
          await prisma.passwordReset.create({
            data: {
              userId: user.id,
              token,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
          });
          const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${encodeURIComponent(token)}`;
          const result = await sendEmail({
            to: user.email,
            subject: "Reset your GarageRoute password",
            body: `Click to reset your password (link expires in 1 hour):\n\n${url}\n\nIf you didn't ask for this, ignore this email.`,
            kind: "support_reply",
            metadata: { kind: "password_reset", userId: user.id },
          });
          return {
            sent: result.ok,
            // `skipped` is true when Resend is unconfigured — the email was
            // queued to PendingEmail instead of sent live.
            queued: result.skipped ?? false,
            reason: result.ok ? "ok" : result.error ?? "send_failed",
          };
        }),
    }),

    magic_link_request: tool({
      description:
        "Send a magic sign-in link to verify the user is who they say they are. Required before any account-scoped support action (cancel reservation, edit listing, etc.). Returns ok regardless of whether the email exists.",
      inputSchema: z.object({
        email: z.string().email(),
      }),
      execute: async (input) =>
        safeExecute(ctx, "magic_link_request", input, async () => {
          const result = await issueMagicLink({
            email: input.email,
            conversationId: ctx.conversationId,
          });
          return { sent: result.ok, queued: !result.token && result.ok, reason: result.reason ?? "ok" };
        }),
    }),

    get_my_sale_status: tool({
      description:
        "Look up a sale the user owns. Requires the user to be verified (magic link or signed in). Returns the sale + manage URL.",
      inputSchema: z.object({
        saleId: z.string().optional(),
        titleHint: z.string().optional().describe("Optional — title keyword to narrow down if user has multiple sales."),
      }),
      execute: async (input) =>
        safeExecute(ctx, "get_my_sale_status", input, async () => {
          const user = await resolveSupportUser({ conversationId: ctx.conversationId });
          if (!user) {
            return { verified: false, reason: "not_verified" };
          }
          const sales = await prisma.sale.findMany({
            where: {
              sellerUserId: user.id,
              ...(input.saleId ? { id: input.saleId } : {}),
              ...(input.titleHint ? { title: { contains: input.titleHint } } : {}),
            },
            include: { _count: { select: { items: true, reservations: true, messages: true } } },
          });
          return {
            verified: true,
            sales: sales.map((s) => ({
              id: s.id,
              title: s.title,
              dates: s.dates,
              hours: s.hours,
              verified: s.verified,
              itemCount: s._count.items,
              reservationCount: s._count.reservations,
              messageCount: s._count.messages,
              manageUrl: `/manage/${s.sellerToken}`,
              publicUrl: `/sales/${s.id}`,
            })),
          };
        }),
    }),

    cancel_my_reservation: tool({
      description:
        "Cancel a reservation the user has placed. Requires verification. Asks for confirmation before acting.",
      inputSchema: z.object({
        reservationId: z.string(),
        confirmed: z.boolean().describe("Must be true to proceed. The bot must confirm with the user first."),
      }),
      execute: async (input) =>
        safeExecute(ctx, "cancel_my_reservation", input, async () => {
          if (!input.confirmed) {
            return { ok: false, reason: "not_confirmed" };
          }
          const user = await resolveSupportUser({ conversationId: ctx.conversationId });
          if (!user) return { ok: false, reason: "not_verified" };
          const reservation = await prisma.reservation.findUnique({
            where: { id: input.reservationId },
            include: { sale: true },
          });
          if (!reservation) return { ok: false, reason: "not_found" };
          if (reservation.buyerEmail !== user.email) {
            return { ok: false, reason: "not_owner" };
          }
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: "cancelled" },
          });
          return { ok: true, reservationId: reservation.id, saleTitle: reservation.sale.title };
        }),
    }),

    handoff_to_human: tool({
      description:
        "Escalate to a human (the founder). Captures the conversation so far and emails a summary. Use this when: the user is angry/stuck, the request is refund/billing/dispute, or you've tried twice and it's not working.",
      inputSchema: z.object({
        reason: z.string().describe("Short reason, e.g. 'refund request', 'stuck on verification', 'angry customer'."),
      }),
      execute: async (input) =>
        safeExecute(ctx, "handoff_to_human", input, async () => {
          const recent = await prisma.botMessage.findMany({
            where: { conversationId: ctx.conversationId },
            orderBy: { createdAt: "desc" },
            take: 10,
          });
          const transcript = recent
            .reverse()
            .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 400)}`)
            .join("\n\n");

          // Email the founder.
          const ownerEmail = process.env.SCOUT_HUMAN_EMAIL || "hello@garageroute.com";
          await sendEmail({
            to: ownerEmail,
            subject: `[Scout handoff] ${input.reason}`,
            body:
              `Conversation: ${ctx.conversationId}\n` +
              `Channel: ${ctx.channel}\n` +
              `Mode: ${ctx.mode}\n` +
              `User: ${ctx.userEmail ?? "anonymous"}\n` +
              `Reason: ${input.reason}\n\n` +
              `--- Last 10 messages ---\n\n${transcript}\n\n` +
              `View in admin: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/conversations/${ctx.conversationId}`,
            kind: "handoff_alert",
            metadata: { conversationId: ctx.conversationId, reason: input.reason },
          });
          return { ok: true, message: "Human notified. They'll follow up by email within a few hours." };
        }),
    }),
  };
}

export type ToolName = keyof ReturnType<typeof buildTools>;