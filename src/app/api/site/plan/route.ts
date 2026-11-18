import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PlanTier } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/webflow";
import { entitlementsForTier } from "@/lib/plan-entitlements";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tier: z.enum(["FREE", "PRO", "BUSINESS", "AGENCY"]),
});

/** Current plan + catalog for the site workspace. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: "asc" },
    });
    const currentTier = (site.plan?.tier as PlanTier) || PlanTier.FREE;
    const entitlements = entitlementsForTier(currentTier);

    return NextResponse.json({
      currentTier,
      planLabel: entitlements.label,
      plans: plans.map((p) => ({
        id: p.id,
        tier: p.tier,
        name: p.name,
        priceMonthly: p.priceMonthly,
        bookingsLimit: p.bookingsLimit,
        staffLimit: p.staffLimit,
        themesLimit: p.themesLimit,
        features: p.features,
        // Paid plans always go through Checkout when Stripe is configured
        hasCheckout: p.tier !== PlanTier.FREE && p.priceMonthly > 0,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

/**
 * Change site plan.
 * - FREE (or free downgrade): apply immediately.
 * - Paid tiers: always open Stripe Checkout (price ID or inline price_data).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const site = await requireDemoSite();
    const plan = await prisma.plan.findUnique({ where: { tier: parsed.data.tier } });
    if (!plan || !plan.active) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (site.planId === plan.id) {
      return NextResponse.json({ ok: true, unchanged: true, tier: plan.tier });
    }

    const isPaid = plan.tier !== PlanTier.FREE && plan.priceMonthly > 0;

    if (isPaid) {
      const stripe = await getStripe();
      if (!stripe) {
        return NextResponse.json(
          {
            error:
              "Stripe is not configured. Add platform Stripe keys in Platform → Stripe before upgrading.",
          },
          { status: 503 },
        );
      }

      const origin = appOrigin();
      const lineItem = plan.stripePriceMoId
        ? { price: plan.stripePriceMoId, quantity: 1 }
        : {
            price_data: {
              currency: "usd",
              unit_amount: plan.priceMonthly,
              recurring: { interval: "month" as const },
              product_data: {
                name: `Slotwise ${plan.name}`,
                description: `${plan.name} plan for ${site.name}`,
              },
            },
            quantity: 1,
          };

      const sessionCheckout = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [lineItem],
        success_url: `${origin}/dashboard/plans?upgraded=${plan.tier}`,
        cancel_url: `${origin}/dashboard/plans?canceled=1`,
        customer_email:
          typeof session.user.email === "string" ? session.user.email : undefined,
        metadata: {
          siteId: site.id,
          planId: plan.id,
          planTier: plan.tier,
        },
        subscription_data: {
          metadata: {
            siteId: site.id,
            planId: plan.id,
            planTier: plan.tier,
          },
        },
      });

      if (!sessionCheckout.url) {
        return NextResponse.json(
          { error: "Stripe Checkout did not return a URL" },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        checkoutUrl: sessionCheckout.url,
        tier: plan.tier,
      });
    }

    // Free plan — apply immediately (no payment)
    await prisma.site.update({
      where: { id: site.id },
      data: { planId: plan.id },
    });
    await prisma.auditLog.create({
      data: {
        scope: "SITE",
        action: "plan.changed",
        siteId: site.id,
        meta: { tier: plan.tier, planId: plan.id },
      },
    });

    return NextResponse.json({
      ok: true,
      applied: true,
      tier: plan.tier,
      label: entitlementsForTier(plan.tier).label,
    });
  } catch (e) {
    console.error("[site.plan]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not change plan" },
      { status: 500 },
    );
  }
}
