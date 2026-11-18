import { prisma } from "@/lib/prisma";

/** Site can collect card payments for paid events. */
export async function siteCanCollectPayments(siteId: string) {
  const stripe = await prisma.stripeAccount.findUnique({
    where: { siteId },
    select: {
      stripeAccountId: true,
      chargesEnabled: true,
      paymentMode: true,
    },
  });
  const connected = Boolean(stripe?.stripeAccountId);
  const chargesEnabled = Boolean(stripe?.chargesEnabled);
  const mode = stripe?.paymentMode || "PAY_ON_SITE";
  return {
    connected,
    chargesEnabled,
    paymentMode: mode,
    /** Paid events (price > 0) require a Stripe account that can charge */
    canChargePaidEvents: connected && chargesEnabled,
    setupUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://slotwise.hindaralabs.com"}/dashboard/payments`,
    message:
      "Connect Stripe (and finish onboarding so charges are enabled) before setting a paid price. Free events (price 0) are always allowed.",
  };
}

export function paidEventRequiresStripe(priceCents: number | undefined | null) {
  return typeof priceCents === "number" && priceCents > 0;
}
