import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { appOrigin } from "@/lib/webflow";
import { createConnectedAccount, createConnectOnboardingLink, getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    let account = site.stripeAccount;
    if (!account) {
      account = await prisma.stripeAccount.create({ data: { siteId: site.id } });
    }

    return NextResponse.json({
      connected: Boolean(account.stripeAccountId && account.chargesEnabled),
      stripeAccountId: account.stripeAccountId,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      paymentMode: account.paymentMode,
      depositPercent: account.depositPercent,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

/** Start Stripe Connect Express onboarding for this site. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Ask the platform admin to add keys." },
      { status: 503 },
    );
  }

  try {
    const site = await requireDemoSite();
    let account = await prisma.stripeAccount.findUnique({ where: { siteId: site.id } });
    if (!account) {
      account = await prisma.stripeAccount.create({ data: { siteId: site.id } });
    }

    let stripeAccountId = account.stripeAccountId;
    if (!stripeAccountId) {
      const created = await createConnectedAccount(session.user.email);
      stripeAccountId = created.id;
      await prisma.stripeAccount.update({
        where: { id: account.id },
        data: { stripeAccountId },
      });
    }

    const origin = appOrigin();
    const link = await createConnectOnboardingLink(
      stripeAccountId,
      `${origin}/dashboard/payments?stripe=return`,
      `${origin}/dashboard/payments?stripe=refresh`,
    );

    await prisma.auditLog.create({
      data: {
        scope: "SITE",
        action: "stripe.connect.started",
        siteId: site.id,
        meta: { stripeAccountId },
      },
    });

    return NextResponse.json({ url: link.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start Stripe Connect" },
      { status: 500 },
    );
  }
}
