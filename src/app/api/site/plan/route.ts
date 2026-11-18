import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PlanTier } from "@prisma/client";
import { z } from "zod";
import type Stripe from "stripe";
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

const FALLBACK_PRICE_CENTS: Record<string, number> = {
  FREE: 0,
  PRO: 1500,
  BUSINESS: 3900,
  AGENCY: 9900,
};

function paidAmountCents(plan: { tier: string; priceMonthly: number }) {
  if (plan.tier === PlanTier.FREE) return 0;
  if (plan.priceMonthly > 0) return plan.priceMonthly;
  return FALLBACK_PRICE_CENTS[plan.tier] ?? 0;
}

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
    const stripe = await getStripe();

    return NextResponse.json({
      currentTier,
      planLabel: entitlements.label,
      siteName: site.branding?.businessName || site.name,
      sitePublicKey: site.publicKey,
      stripeReady: Boolean(stripe),
      plans: plans.map((p) => {
        const amount = paidAmountCents(p);
        return {
          id: p.id,
          tier: p.tier,
          name: p.name,
          priceMonthly: amount,
          bookingsLimit: p.bookingsLimit,
          staffLimit: p.staffLimit,
          themesLimit: p.themesLimit,
          features: p.features,
          requiresCheckout: p.tier !== PlanTier.FREE && amount > 0,
        };
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

async function createSubscriptionCheckout(input: {
  stripe: Stripe;
  siteId: string;
  siteName: string;
  planId: string;
  planTier: string;
  planName: string;
  amountCents: number;
  stripePriceMoId: string | null;
  customerEmail?: string;
}) {
  const origin = appOrigin();
  const successUrl = `${origin}/dashboard/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/dashboard/plans?canceled=1`;

  const base = {
    mode: "subscription" as const,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: input.customerEmail,
    client_reference_id: input.siteId,
    // Disable Managed Payments (requires product tax codes by default on newer Stripe accounts)
    managed_payments: { enabled: false },
    metadata: {
      siteId: input.siteId,
      planId: input.planId,
      planTier: input.planTier,
    },
    subscription_data: {
      metadata: {
        siteId: input.siteId,
        planId: input.planId,
        planTier: input.planTier,
      },
    },
  };

  // Prefer catalog price ID; if it fails (wrong account / deleted), fall back to inline price_data
  if (input.stripePriceMoId) {
    try {
      return await input.stripe.checkout.sessions.create({
        ...base,
        line_items: [{ price: input.stripePriceMoId, quantity: 1 }],
      } as Stripe.Checkout.SessionCreateParams);
    } catch (err) {
      console.warn("[site.plan] stripePriceMoId failed, using price_data", err);
    }
  }

  return input.stripe.checkout.sessions.create({
    ...base,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          recurring: { interval: "month" },
          product_data: {
            name: `Slotwise ${input.planName}`,
            description: `${input.planName} plan · ${input.siteName}`,
            tax_code: "txcd_10103001",
          },
        },
      },
    ],
  } as Stripe.Checkout.SessionCreateParams);
}

/**
 * Change site plan.
 * - FREE: apply immediately.
 * - Paid: NEVER apply here — only return Stripe Checkout URL. Webhook / session verify applies plan.
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

    const amountCents = paidAmountCents(plan);
    const requiresPayment = plan.tier !== PlanTier.FREE && amountCents > 0;

    if (requiresPayment) {
      const stripe = await getStripe();
      if (!stripe) {
        return NextResponse.json(
          {
            error:
              "Stripe is not configured. Add secret key in Platform → Stripe, then try Upgrade again.",
          },
          { status: 503 },
        );
      }

      const sessionCheckout = await createSubscriptionCheckout({
        stripe,
        siteId: site.id,
        siteName: site.name,
        planId: plan.id,
        planTier: plan.tier,
        planName: plan.name,
        amountCents,
        stripePriceMoId: plan.stripePriceMoId,
        customerEmail:
          typeof session.user.email === "string" ? session.user.email : undefined,
      });

      if (!sessionCheckout.url) {
        return NextResponse.json(
          { error: "Stripe Checkout did not return a URL. Check Platform → Stripe keys." },
          { status: 502 },
        );
      }

      // Do NOT update site.planId here — only after successful payment
      return NextResponse.json({
        ok: true,
        requiresCheckout: true,
        checkoutUrl: sessionCheckout.url,
        tier: plan.tier,
      });
    }

    // Free only — apply immediately
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
      { error: e instanceof Error ? e.message : "Could not start plan checkout" },
      { status: 500 },
    );
  }
}
