import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = await getStripe();
  const secret = await getStripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const bookingId = pi.metadata?.bookingId;
      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "PAID",
            stripePaymentId: pi.id,
          },
        });
        await prisma.auditLog.create({
          data: {
            scope: "SITE",
            action: "booking.paid",
            meta: { bookingId, paymentIntent: pi.id },
          },
        });
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object;
      await prisma.stripeAccount.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          chargesEnabled: Boolean(account.charges_enabled),
          payoutsEnabled: Boolean(account.payouts_enabled),
        },
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        metadata?: {
          siteId?: string;
          planId?: string;
          planTier?: string;
          bookingId?: string;
        };
        mode?: string;
        payment_intent?: string | { id?: string } | null;
      };
      if (session.mode === "subscription" && session.metadata?.siteId && session.metadata?.planId) {
        await prisma.site.update({
          where: { id: session.metadata.siteId },
          data: { planId: session.metadata.planId },
        });
        await prisma.auditLog.create({
          data: {
            scope: "SITE",
            action: "plan.upgraded",
            siteId: session.metadata.siteId,
            meta: {
              planId: session.metadata.planId,
              tier: session.metadata.planTier,
            },
          },
        });
      }
      if (session.mode === "payment" && session.metadata?.bookingId) {
        const pi =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null;
        await prisma.booking.update({
          where: { id: session.metadata.bookingId },
          data: {
            status: "PAID",
            ...(pi ? { stripePaymentId: pi } : {}),
          },
        });
        await prisma.auditLog.create({
          data: {
            scope: "SITE",
            action: "booking.paid",
            meta: { bookingId: session.metadata.bookingId, checkout: true },
          },
        });
      }
    }
  } catch (e) {
    console.error("Webhook handler error", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
