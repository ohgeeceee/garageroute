import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-05-27.dahlia" }) : null;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { saleId, itemId, buyerName, buyerEmail, amount } = body;

  if (!saleId || !itemId || !buyerName || !buyerEmail || !amount) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: { where: { id: itemId } } },
  });

  if (!sale || sale.items.length === 0) {
    return NextResponse.json({ error: "Sale or item not found" }, { status: 404 });
  }

  const deposit = Math.max(1, Math.round(Number(amount) * 100));

  let paymentIntentId = "";
  let clientSecret = "";
  let status = "pending";

  if (stripe) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: deposit,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          saleId,
          itemId,
          buyerEmail,
        },
      });
      paymentIntentId = paymentIntent.id;
      clientSecret = paymentIntent.client_secret || "";
      status = "pending";
    } catch (err) {
      console.error("Stripe error:", err);
      return NextResponse.json(
        { error: "Payment provider unavailable" },
        { status: 500 }
      );
    }
  } else {
    // Mock mode for prototype without Stripe keys
    paymentIntentId = `mock_pi_${Date.now()}`;
    clientSecret = paymentIntentId;
    status = "pending";
  }

  const reservation = await prisma.reservation.create({
    data: {
      saleId,
      itemId,
      buyerName: String(buyerName).trim(),
      buyerEmail: String(buyerEmail).trim().toLowerCase(),
      amount: Number(amount),
      status,
      paymentIntentId,
    },
  });

  return NextResponse.json({ reservation, clientSecret }, { status: 201 });
}
