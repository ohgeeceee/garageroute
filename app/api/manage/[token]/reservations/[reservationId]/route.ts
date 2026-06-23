import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2026-05-27.dahlia" })
  : null;

/**
 * Allowed reservation status transitions from the seller dashboard.
 * Anything else is ignored (we don't want the UI to silently invent statuses).
 */
const SELLER_STATUS_ACTIONS = new Set(["redeemed", "refunded"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; reservationId: string }> }
) {
  const { token, reservationId } = await params;
  const body = await request.json().catch(() => ({}));

  const sale = await prisma.sale.findUnique({
    where: { sellerToken: token },
  });
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, saleId: sale.id },
    include: { item: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  const nextStatus = typeof body.status === "string" ? body.status : "";
  if (!SELLER_STATUS_ACTIONS.has(nextStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Allowed: redeemed, refunded" },
      { status: 400 }
    );
  }

  // Idempotency — if already in the target status, no-op.
  if (reservation.status === nextStatus) {
    return NextResponse.json(reservation);
  }

  // Refund path — actually move money back via Stripe before flipping status.
  // A failed refund must NOT mark the reservation as refunded; otherwise the
  // seller has told the buyer "we refunded you" while Stripe still has the cash.
  if (nextStatus === "refunded") {
    const piId = reservation.paymentIntentId;
    const isMock = !piId || piId.startsWith("mock_pi_");

    if (!isMock && stripe) {
      try {
        await stripe.refunds.create({
          payment_intent: piId,
          // Full refund for now — partial refunds can come later if needed.
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Stripe refund failed.";
        console.error("[manage] stripe refund failed:", err);
        // Audit the failure so support can see it.
        await logAudit({
          actor: `seller:${sale.id}`,
          action: "sale.update",
          entity: "sale",
          entityId: sale.id,
          metadata: {
            kind: "refund_failed",
            reservationId,
            paymentIntentId: piId,
            error: msg,
          },
        });
        return NextResponse.json(
          { error: `Refund failed: ${msg}` },
          { status: 502 }
        );
      }
    }
    // Mock mode — no Stripe call. The DB flip + buyer email is the whole story.
  }

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: nextStatus },
  });

  // Best-effort buyer notification. sendEmail() handles missing Resend keys
  // gracefully (writes to EmailMessage, marks failed, doesn't throw).
  if (nextStatus === "refunded" && reservation.buyerEmail) {
    sendEmail({
      to: reservation.buyerEmail,
      subject: `Refund issued — ${sale.title}`,
      text:
        `Your deposit of $${reservation.amount.toFixed(2)} for "${
          reservation.item.name
        }" at ${sale.title} has been refunded.\n\n` +
        `View your sale: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sales/${sale.id}\n\n` +
        `— GarageRoute`,
      kind: "reservation_refunded",
      metadata: {
        saleId: sale.id,
        reservationId,
        amount: reservation.amount,
      },
    }).catch((err) => {
      console.error("[manage] refund buyer email failed:", err);
    });
  }

  // Audit log — separate action so admins can filter for refunds cleanly.
  await logAudit({
    actor: `seller:${sale.id}`,
    action: "sale.update",
    entity: "sale",
    entityId: sale.id,
    metadata: {
      kind: nextStatus === "refunded" ? "refund" : nextStatus,
      reservationId,
      itemName: reservation.item.name,
      amount: reservation.amount,
      paymentIntentId: reservation.paymentIntentId,
      mockStripe: !stripe || reservation.paymentIntentId.startsWith("mock_pi_"),
    },
  });

  return NextResponse.json(updated);
}
