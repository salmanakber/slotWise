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

function stripeErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return err instanceof Error ? err.message : "Checkout session failed";
}

/**
 * Checkout Session for a booking deposit/full payment.
 * 1) Direct charge on the connected account (SaaS / Express)
 * 2) Fallback: destination charge on the platform → transfer to connected account
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
  if (!client) throw new Error("Stripe not configured — add the secret key in Platform → Stripe");
  const feePercent = await getApplicationFeePercent();
  const applicationFeeAmount = feePercent > 0 ? Math.round((input.amountCents * feePercent) / 100) : 0;
  const currency = input.currency.toLowerCase();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: input.amountCents,
        product_data: {
          name: input.serviceName.slice(0, 120) || "Booking",
          description: `Booking ${input.bookingReference}`.slice(0, 500),
        },
      },
    },
  ];

  const base: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: lineItems,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      bookingId: input.bookingId,
      platform: "slotwise",
    },
  };

  // Attempt 1 — direct charge on connected account
  try {
    const session = await client.checkout.sessions.create(
      {
        ...base,
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
        idempotencyKey: `booking_checkout_direct_${input.bookingId}`,
      },
    );
    if (!session.url) throw new Error("Stripe Checkout did not return a payment URL");
    return session;
  } catch (directErr) {
    console.error("[stripe:checkout:direct]", stripeErrorMessage(directErr));
  }

  // Attempt 2 — destination charge (platform Checkout → connected account)
  try {
    const session = await client.checkout.sessions.create(
      {
        ...base,
        payment_intent_data: {
          metadata: {
            bookingId: input.bookingId,
            platform: "slotwise",
          },
          transfer_data: {
            destination: input.connectedAccountId,
          },
          ...(applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {}),
        },
      },
      {
        idempotencyKey: `booking_checkout_dest_${input.bookingId}`,
      },
    );
    if (!session.url) throw new Error("Stripe Checkout did not return a payment URL");
    return session;
  } catch (destErr) {
    const message = stripeErrorMessage(destErr);
    console.error("[stripe:checkout:destination]", {
      connectedAccountId: input.connectedAccountId,
      amountCents: input.amountCents,
      currency,
      message,
    });
    throw new Error(message);
  }
}
