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

    // Refresh live status from Stripe when connected
    if (account.stripeAccountId) {
      const stripe = await getStripe();
      if (stripe) {
        try {
          const remote = await stripe.accounts.retrieve(account.stripeAccountId);
          account = await prisma.stripeAccount.update({
            where: { id: account.id },
            data: {
              chargesEnabled: Boolean(remote.charges_enabled),
              payoutsEnabled: Boolean(remote.payouts_enabled),
            },
          });
        } catch {
          /* keep local row */
        }
      }
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
      { error: "Stripe is not configured. Add secret key in Platform → Stripe." },
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
      const email =
        typeof session.user.email === "string" && session.user.email.includes("@")
          ? session.user.email
          : undefined;
      const created = await createConnectedAccount(email);
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

    if (!link?.url) {
      return NextResponse.json(
        { error: "Stripe did not return an onboarding URL" },
        { status: 502 },
      );
    }

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
    console.error("[stripe.connect]", e);
    const message =
      e instanceof Error
        ? e.message
        : "Could not start Stripe Connect. Confirm Connect is enabled on your Stripe account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
