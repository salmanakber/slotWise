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

/** Create a Connect Accounts v2 onboarding link for a site. */
export async function createConnectOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  // rawRequest avoids SDK type gaps on older stripe installs for v2 accountLinks
  return (await client.rawRequest("POST", "/v2/core/account_links", {
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
  })) as V2AccountLink;
}

/**
 * Create a connected account via Accounts v2 (POST /v2/core/accounts).
 * Destination charges without on_behalf_of → recipient + stripe_transfers.
 * Express dashboard requires platform fees/losses liability (application).
 */
export async function createConnectedAccount(email?: string | null) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  // rawRequest avoids SDK type gaps on older stripe installs for v2 accounts
  return (await client.rawRequest("POST", "/v2/core/accounts", {
    ...(email ? { contact_email: email } : {}),
    display_name: "Slotwise bookings",
    dashboard: "express",
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
      profile: {
        product_description: "Appointments booked via Slotwise",
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    include: ["configuration.recipient", "defaults", "requirements"],
  })) as V2Account;
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
