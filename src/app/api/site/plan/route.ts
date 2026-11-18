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
        hasCheckout: Boolean(p.stripePriceMoId),
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
 * - If the Plan has a Stripe price ID, return a Checkout URL.
 * - Otherwise apply the plan immediately (platform-managed billing).
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

    const stripe = await getStripe();
    if (stripe && plan.stripePriceMoId && plan.tier !== PlanTier.FREE) {
      const origin = appOrigin();
      const sessionCheckout = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: plan.stripePriceMoId, quantity: 1 }],
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
      return NextResponse.json({
        ok: true,
        checkoutUrl: sessionCheckout.url,
        tier: plan.tier,
      });
    }

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
