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

/** Best-effort ISO country from a site currency (merchant confirms during onboarding). */
export function countryFromCurrency(currency?: string | null): string {
  const c = (currency || "USD").toUpperCase();
  const map: Record<string, string> = {
    USD: "us",
    GBP: "gb",
    EUR: "ie",
    CAD: "ca",
    AUD: "au",
    NZD: "nz",
    SGD: "sg",
    HKD: "hk",
    JPY: "jp",
    INR: "in",
    PKR: "pk",
    AED: "ae",
    SAR: "sa",
    CHF: "ch",
    SEK: "se",
    NOK: "no",
    DKK: "dk",
    MXN: "mx",
    BRL: "br",
  };
  return map[c] ?? "us";
}

/**
 * Create a connected account via Accounts v2 (POST /v2/core/accounts).
 * Managed Risk (SaaS): Stripe collects fees/losses; Express + merchant card_payments.
 * identity.country is required before configuration.merchant.
 */
export async function createConnectedAccount(input?: {
  email?: string | null;
  country?: string | null;
  currency?: string | null;
  displayName?: string | null;
}) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  const country = (input?.country || countryFromCurrency(input?.currency)).toLowerCase();
  const currency = (input?.currency || "USD").toLowerCase();
  return (await client.rawRequest(
    "POST",
    "/v2/core/accounts",
    {
      ...(input?.email ? { contact_email: input.email } : {}),
      display_name: input?.displayName?.trim() || "Slotwise bookings",
      dashboard: "express",
      identity: {
        country,
      },
      defaults: {
        currency,
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
      include: ["configuration.merchant", "identity", "defaults", "requirements"],
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

/**
 * Checkout Session for a booking deposit/full payment on the connected account.
 * Uses the site's currency so multi-currency bookings charge correctly in Stripe.
 */
export async function createBookingCheckoutSession(input: {
  amountCents: number;
  currency: string;
  connectedAccountId: string;
  bookingId: string;
  bookingReference: string;
  serviceName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const client = await getStripe();
  if (!client) throw new Error("Stripe not configured");
  const feePercent = await getApplicationFeePercent();
  const applicationFeeAmount = feePercent > 0 ? Math.round((input.amountCents * feePercent) / 100) : 0;
  const currency = input.currency.toLowerCase();

  return client.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: input.amountCents,
            product_data: {
              name: input.serviceName,
              description: `Booking ${input.bookingReference}`,
            },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        bookingId: input.bookingId,
        platform: "slotwise",
      },
      payment_intent_data: {
        metadata: {
          bookingId: input.bookingId,
          platform: "slotwise",
        },
        ...(applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {}),
      },
    },
    {
      stripeAccount: input.connectedAccountId,
      idempotencyKey: `booking_checkout_${input.bookingId}`,
    },
  );
}
