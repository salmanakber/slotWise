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

type V2Account = { id: string };
type V2AccountLink = { url: string };

/** Accounts v2 Connect endpoints require a .preview Stripe-Version header. */
const STRIPE_ACCOUNTS_V2_VERSION = "2026-10-28.preview";

/** Create a Connect Accounts v2 onboarding link for a site. */
export async function createConnectOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  return (await client.rawRequest(
    "POST",
    "/v2/core/account_links",
    {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          return_url: returnUrl,
          refresh_url: refreshUrl,
          collection_options: {
            fields: "eventually_due",
          },
        },
      },
    },
    { apiVersion: STRIPE_ACCOUNTS_V2_VERSION },
  )) as unknown as V2AccountLink;
}

/**
 * Create a connected account via Accounts v2 (POST /v2/core/accounts).
 * Managed Risk (SaaS): Stripe collects fees/losses; Express + merchant card_payments.
 * Compatible with direct charges on the connected account.
 */
export async function createConnectedAccount(email?: string | null) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  return (await client.rawRequest(
    "POST",
    "/v2/core/accounts",
    {
      ...(email ? { contact_email: email } : {}),
      display_name: "Slotwise bookings",
      dashboard: "express",
      defaults: {
        responsibilities: {
          fees_collector: "stripe",
          losses_collector: "stripe",
        },
        profile: {
          product_description: "Appointments booked via Slotwise",
        },
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { requested: true },
          },
        },
      },
      include: ["configuration.merchant", "defaults", "requirements"],
    },
    { apiVersion: STRIPE_ACCOUNTS_V2_VERSION },
  )) as unknown as V2Account;
}

/**
 * Direct-charge PaymentIntent on the connected account (Managed Risk / SaaS).
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
      ...(applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {}),
    },
    {
      stripeAccount: input.connectedAccountId,
      idempotencyKey: `booking_${input.bookingId}`,
    },
  );
}
