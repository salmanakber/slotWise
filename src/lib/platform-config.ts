import { CONTACT_EMAIL } from "@/lib/brand";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const PLATFORM_ID = "platform";

export type PlatformPublicSettings = {
  stripeMode: string;
  stripePublishableKey: string | null;
  stripeSecretKeySet: boolean;
  stripeSecretKeyHint: string | null;
  stripeWebhookSecretSet: boolean;
  stripeWebhookSecretHint: string | null;
  applicationFeePercent: number;
  stripeRequireOnboarding: boolean;
  stripeAllowDeposits: boolean;
  stripeAllowPayOnSite: boolean;
  stripeSaveCardForNoShow: boolean;
  emailProvider: string;
  emailFrom: string | null;
  postmarkTokenSet: boolean;
  postmarkTokenHint: string | null;
  smsProvider: string;
  twilioAccountSid: string | null;
  twilioAuthTokenSet: boolean;
  twilioAuthTokenHint: string | null;
  twilioFromNumber: string | null;
  twilioWhatsappFrom: string | null;
  webflowClientId: string | null;
  webflowClientSecretSet: boolean;
  maintenanceMode: boolean;
  supportEmail: string | null;
  source: "database" | "fallback";
};

function maskSecret(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

function safeDecrypt(payload: string | null | undefined) {
  if (!payload) return null;
  try {
    return decryptSecret(payload);
  } catch {
    return null;
  }
}

async function ensureRow() {
  return prisma.platformConfig.upsert({
    where: { id: PLATFORM_ID },
    update: {},
    create: { id: PLATFORM_ID },
  });
}

/** Public + masked view for the platform admin UI. */
export async function getPlatformPublicSettings(): Promise<PlatformPublicSettings> {
  try {
    const row = await ensureRow();
    const secret = safeDecrypt(row.stripeSecretKeyEncrypted);
    const webhook = safeDecrypt(row.stripeWebhookSecretEncrypted);
    const postmark = safeDecrypt(row.postmarkTokenEncrypted);
    const twilio = safeDecrypt(row.twilioAuthTokenEncrypted);

    return {
      stripeMode: row.stripeMode,
      stripePublishableKey:
        row.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
      stripeSecretKeySet: Boolean(secret || process.env.STRIPE_SECRET_KEY),
      stripeSecretKeyHint: maskSecret(secret || process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecretSet: Boolean(webhook || process.env.STRIPE_WEBHOOK_SECRET),
      stripeWebhookSecretHint: maskSecret(webhook || process.env.STRIPE_WEBHOOK_SECRET),
      applicationFeePercent: row.applicationFeePercent,
      stripeRequireOnboarding: row.stripeRequireOnboarding,
      stripeAllowDeposits: row.stripeAllowDeposits,
      stripeAllowPayOnSite: row.stripeAllowPayOnSite,
      stripeSaveCardForNoShow: row.stripeSaveCardForNoShow,
      emailProvider: row.emailProvider,
      emailFrom: row.emailFrom || process.env.EMAIL_FROM || null,
      postmarkTokenSet: Boolean(postmark || process.env.POSTMARK_API_TOKEN),
      postmarkTokenHint: maskSecret(postmark || process.env.POSTMARK_API_TOKEN),
      smsProvider: row.smsProvider,
      twilioAccountSid: row.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || null,
      twilioAuthTokenSet: Boolean(twilio || process.env.TWILIO_AUTH_TOKEN),
      twilioAuthTokenHint: maskSecret(twilio || process.env.TWILIO_AUTH_TOKEN),
      twilioFromNumber: row.twilioFromNumber || process.env.TWILIO_FROM_NUMBER || null,
      twilioWhatsappFrom: row.twilioWhatsappFrom,
      webflowClientId: row.webflowClientId || process.env.WEBFLOW_CLIENT_ID || null,
      webflowClientSecretSet: Boolean(
        safeDecrypt(row.webflowClientSecretEncrypted) || process.env.WEBFLOW_CLIENT_SECRET,
      ),
      maintenanceMode: row.maintenanceMode,
      supportEmail: row.supportEmail || CONTACT_EMAIL,
      source: "database",
    };
  } catch {
    return {
      stripeMode: "test",
      stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
      stripeSecretKeySet: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeSecretKeyHint: maskSecret(process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecretSet: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      stripeWebhookSecretHint: maskSecret(process.env.STRIPE_WEBHOOK_SECRET),
      applicationFeePercent: 0,
      stripeRequireOnboarding: true,
      stripeAllowDeposits: true,
      stripeAllowPayOnSite: true,
      stripeSaveCardForNoShow: true,
      emailProvider: "postmark",
      emailFrom: process.env.EMAIL_FROM || null,
      postmarkTokenSet: Boolean(process.env.POSTMARK_API_TOKEN),
      postmarkTokenHint: maskSecret(process.env.POSTMARK_API_TOKEN),
      smsProvider: "twilio",
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || null,
      twilioAuthTokenSet: Boolean(process.env.TWILIO_AUTH_TOKEN),
      twilioAuthTokenHint: maskSecret(process.env.TWILIO_AUTH_TOKEN),
      twilioFromNumber: process.env.TWILIO_FROM_NUMBER || null,
      twilioWhatsappFrom: null,
      webflowClientId: process.env.WEBFLOW_CLIENT_ID || null,
      webflowClientSecretSet: Boolean(process.env.WEBFLOW_CLIENT_SECRET),
      maintenanceMode: false,
      supportEmail: CONTACT_EMAIL,
      source: "fallback",
    };
  }
}

/** Decrypted secrets for server-side providers. DB wins, then env. */
export async function getPlatformSecrets() {
  try {
    const row = await ensureRow();
    return {
      stripeMode: row.stripeMode as "test" | "live",
      stripePublishableKey:
        row.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
      stripeSecretKey: safeDecrypt(row.stripeSecretKeyEncrypted) || process.env.STRIPE_SECRET_KEY || null,
      stripeWebhookSecret:
        safeDecrypt(row.stripeWebhookSecretEncrypted) || process.env.STRIPE_WEBHOOK_SECRET || null,
      applicationFeePercent: row.applicationFeePercent,
      emailFrom: row.emailFrom || process.env.EMAIL_FROM || null,
      postmarkToken: safeDecrypt(row.postmarkTokenEncrypted) || process.env.POSTMARK_API_TOKEN || null,
      twilioAccountSid: row.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || null,
      twilioAuthToken: safeDecrypt(row.twilioAuthTokenEncrypted) || process.env.TWILIO_AUTH_TOKEN || null,
      twilioFromNumber: row.twilioFromNumber || process.env.TWILIO_FROM_NUMBER || null,
      twilioWhatsappFrom: row.twilioWhatsappFrom,
      webflowClientId: row.webflowClientId || process.env.WEBFLOW_CLIENT_ID || null,
      webflowClientSecret:
        safeDecrypt(row.webflowClientSecretEncrypted) || process.env.WEBFLOW_CLIENT_SECRET || null,
      maintenanceMode: row.maintenanceMode,
      supportEmail: row.supportEmail,
    };
  } catch {
    return {
      stripeMode: "test" as const,
      stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
      applicationFeePercent: 0,
      emailFrom: process.env.EMAIL_FROM || null,
      postmarkToken: process.env.POSTMARK_API_TOKEN || null,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || null,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || null,
      twilioFromNumber: process.env.TWILIO_FROM_NUMBER || null,
      twilioWhatsappFrom: null as string | null,
      webflowClientId: process.env.WEBFLOW_CLIENT_ID || null,
      webflowClientSecret: process.env.WEBFLOW_CLIENT_SECRET || null,
      maintenanceMode: false,
      supportEmail: null as string | null,
    };
  }
}

export type PlatformSettingsUpdate = {
  stripeMode?: "test" | "live";
  stripePublishableKey?: string | null;
  /** Pass a new secret to rotate; omit/empty to keep existing */
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  applicationFeePercent?: number;
  stripeRequireOnboarding?: boolean;
  stripeAllowDeposits?: boolean;
  stripeAllowPayOnSite?: boolean;
  stripeSaveCardForNoShow?: boolean;
  emailProvider?: string;
  emailFrom?: string | null;
  postmarkToken?: string;
  smsProvider?: string;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string;
  twilioFromNumber?: string | null;
  twilioWhatsappFrom?: string | null;
  webflowClientId?: string | null;
  webflowClientSecret?: string;
  maintenanceMode?: boolean;
  supportEmail?: string | null;
};

export async function updatePlatformSettings(input: PlatformSettingsUpdate) {
  await ensureRow();

  const data: Record<string, unknown> = {};

  if (input.stripeMode) data.stripeMode = input.stripeMode;
  if (input.stripePublishableKey !== undefined) data.stripePublishableKey = input.stripePublishableKey || null;
  if (input.stripeSecretKey?.trim()) data.stripeSecretKeyEncrypted = encryptSecret(input.stripeSecretKey.trim());
  if (input.stripeWebhookSecret?.trim()) {
    data.stripeWebhookSecretEncrypted = encryptSecret(input.stripeWebhookSecret.trim());
  }
  if (input.applicationFeePercent !== undefined) data.applicationFeePercent = input.applicationFeePercent;
  if (input.stripeRequireOnboarding !== undefined) data.stripeRequireOnboarding = input.stripeRequireOnboarding;
  if (input.stripeAllowDeposits !== undefined) data.stripeAllowDeposits = input.stripeAllowDeposits;
  if (input.stripeAllowPayOnSite !== undefined) data.stripeAllowPayOnSite = input.stripeAllowPayOnSite;
  if (input.stripeSaveCardForNoShow !== undefined) {
    data.stripeSaveCardForNoShow = input.stripeSaveCardForNoShow;
  }
  if (input.emailProvider) data.emailProvider = input.emailProvider;
  if (input.emailFrom !== undefined) data.emailFrom = input.emailFrom || null;
  if (input.postmarkToken?.trim()) data.postmarkTokenEncrypted = encryptSecret(input.postmarkToken.trim());
  if (input.smsProvider) data.smsProvider = input.smsProvider;
  if (input.twilioAccountSid !== undefined) data.twilioAccountSid = input.twilioAccountSid || null;
  if (input.twilioAuthToken?.trim()) data.twilioAuthTokenEncrypted = encryptSecret(input.twilioAuthToken.trim());
  if (input.twilioFromNumber !== undefined) data.twilioFromNumber = input.twilioFromNumber || null;
  if (input.twilioWhatsappFrom !== undefined) data.twilioWhatsappFrom = input.twilioWhatsappFrom || null;
  if (input.webflowClientId !== undefined) data.webflowClientId = input.webflowClientId || null;
  if (input.webflowClientSecret?.trim()) {
    data.webflowClientSecretEncrypted = encryptSecret(input.webflowClientSecret.trim());
  }
  if (input.maintenanceMode !== undefined) data.maintenanceMode = input.maintenanceMode;
  if (input.supportEmail !== undefined) data.supportEmail = input.supportEmail || null;

  const updated = await prisma.platformConfig.update({
    where: { id: PLATFORM_ID },
    data,
  });

  await prisma.auditLog.create({
    data: {
      scope: "PLATFORM",
      action: "platform.settings.updated",
      meta: {
        fields: Object.keys(data).filter((k) => !k.toLowerCase().includes("encrypted")),
      },
    },
  });

  // Invalidate cached Stripe client when secrets change
  if (input.stripeSecretKey?.trim()) {
    const { resetStripeClient } = await import("@/lib/stripe");
    resetStripeClient();
  }

  return updated;
}
