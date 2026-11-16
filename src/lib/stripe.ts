import Stripe from "stripe";
import { getPlatformSecrets } from "@/lib/platform-config";

let stripe: Stripe | null = null;
let stripeKeyUsed: string | null = null;

export function resetStripeClient() {
  stripe = null;
  stripeKeyUsed = null;
}

export async function getStripe() {
  const secrets = await getPlatformSecrets();
  const key = secrets.stripeSecretKey;
  if (!key) return null;
  if (!stripe || stripeKeyUsed !== key) {
    stripe = new Stripe(key);
    stripeKeyUsed = key;
  }
  return stripe;
}

export async function stripeConfigured() {
  const secrets = await getPlatformSecrets();
  return Boolean(secrets.stripeSecretKey);
}

export async function getStripeWebhookSecret() {
  const secrets = await getPlatformSecrets();
  return secrets.stripeWebhookSecret;
}

export async function getApplicationFeePercent() {
  const secrets = await getPlatformSecrets();
  return secrets.applicationFeePercent ?? 0;
}

/** Create a Connect account link for a site (onboarding). */
export async function createConnectOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  return client.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function createConnectedAccount(email?: string | null) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  return client.accounts.create({
    type: "express",
    ...(email ? { email } : {}),
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: { product_description: "Appointments booked via Slotwise" },
  });
}

/**
 * PaymentIntent for deposit/full amount.
 * Application fee defaults to 0 — Slotwise takes no commission unless you set it in admin.
 */
export async function createBookingPaymentIntent(input: {
  amountCents: number;
  currency: string;
  connectedAccountId: string;
  bookingId: string;
  customerEmail: string;
}) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  const feePercent = await getApplicationFeePercent();
  const applicationFeeAmount = feePercent > 0 ? Math.round((input.amountCents * feePercent) / 100) : 0;

  return client.paymentIntents.create(
    {
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      receipt_email: input.customerEmail,
      metadata: { bookingId: input.bookingId, platform: "slotwise" },
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: input.connectedAccountId },
    },
    { idempotencyKey: `booking_${input.bookingId}` },
  );
}
