import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { entitlementsForTier } from "@/lib/plan-entitlements";
import { PlanTier } from "@prisma/client";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * After Stripe Checkout success redirect, verify the session was paid and apply the plan.
 * Complements the webhook so upgrades work even if webhook delivery is delayed.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const site = await requireDemoSite();
    const checkout = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);

    if (checkout.mode !== "subscription") {
      return NextResponse.json({ error: "Not a subscription checkout" }, { status: 400 });
    }

    const paid =
      checkout.payment_status === "paid" ||
      checkout.payment_status === "no_payment_required" ||
      checkout.status === "complete";

    if (!paid) {
      return NextResponse.json(
        { error: "Payment not completed yet", paymentStatus: checkout.payment_status },
        { status: 402 },
      );
    }

    const siteId = checkout.metadata?.siteId || checkout.client_reference_id;
    const planId = checkout.metadata?.planId;
    const planTier = checkout.metadata?.planTier;

    if (!siteId || siteId !== site.id) {
      return NextResponse.json({ error: "Checkout does not match this workspace" }, { status: 403 });
    }
    if (!planId) {
      return NextResponse.json({ error: "Checkout missing plan metadata" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await prisma.site.update({
      where: { id: site.id },
      data: { planId: plan.id },
    });
    await prisma.auditLog.create({
      data: {
        scope: "SITE",
        action: "plan.upgraded",
        siteId: site.id,
        meta: {
          planId: plan.id,
          tier: planTier || plan.tier,
          checkoutSessionId: checkout.id,
        },
      },
    });

    const tier = (plan.tier as PlanTier) || PlanTier.PRO;
    return NextResponse.json({
      ok: true,
      tier,
      label: entitlementsForTier(tier).label,
    });
  } catch (e) {
    console.error("[site.plan.confirm]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not confirm checkout" },
      { status: 500 },
    );
  }
}
