import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Create a Connect account link for a site (onboarding). */
export async function createConnectOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");
  return client.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function createConnectedAccount(email: string) {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");
  return client.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: { product_description: "Appointments booked via Slotwise" },
  });
}

/**
 * PaymentIntent for deposit/full amount.
 * Application fee stays 0 — Slotwise takes no commission.
 */
export async function createBookingPaymentIntent(input: {
  amountCents: number;
  currency: string;
  connectedAccountId: string;
  bookingId: string;
  customerEmail: string;
}) {
  const client = getStripe();
  if (!client) throw new Error("Stripe not configured");

  return client.paymentIntents.create(
    {
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      receipt_email: input.customerEmail,
      metadata: { bookingId: input.bookingId, platform: "slotwise" },
      application_fee_amount: 0,
      transfer_data: { destination: input.connectedAccountId },
    },
    { idempotencyKey: `booking_${input.bookingId}` },
  );
}
