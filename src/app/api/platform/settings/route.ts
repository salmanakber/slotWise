import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPlatformPublicSettings,
  updatePlatformSettings,
} from "@/lib/platform-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPlatformPublicSettings();
  return NextResponse.json(settings);
}

const bodySchema = z.object({
  stripeMode: z
    .union([z.enum(["test", "live"]), z.string()])
    .optional()
    .transform((v) => (v === "live" || v === "test" ? v : undefined)),
  stripePublishableKey: z.string().nullable().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  applicationFeePercent: z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.round(n);
  }, z.number().int().min(0).max(30).optional()),
  stripeRequireOnboarding: z.boolean().optional(),
  stripeAllowDeposits: z.boolean().optional(),
  stripeAllowPayOnSite: z.boolean().optional(),
  stripeSaveCardForNoShow: z.boolean().optional(),
  emailProvider: z.string().optional(),
  emailFrom: z.string().nullable().optional(),
  resendApiKey: z.string().optional(),
  postmarkToken: z.string().optional(),
  smsProvider: z.string().optional(),
  twilioAccountSid: z.string().nullable().optional(),
  twilioAuthToken: z.string().optional(),
  twilioFromNumber: z.string().nullable().optional(),
  twilioWhatsappFrom: z.string().nullable().optional(),
  whatsappProvider: z
    .union([z.enum(["twilio", "meta", "openwa"]), z.string()])
    .optional()
    .transform((v) =>
      v === "twilio" || v === "meta" || v === "openwa" ? v : undefined,
    ),
  metaWhatsappPhoneNumberId: z.string().nullable().optional(),
  metaWhatsappAccessToken: z.string().optional(),
  metaWhatsappApiVersion: z.string().nullable().optional(),
  openwaBaseUrl: z.string().nullable().optional(),
  openwaApiKey: z.string().optional(),
  openwaSessionId: z.string().nullable().optional(),
  webflowClientId: z.string().nullable().optional(),
  webflowClientSecret: z.string().optional(),
  googleClientId: z.string().nullable().optional(),
  googleClientSecret: z.string().optional(),
  microsoftClientId: z.string().nullable().optional(),
  microsoftClientSecret: z.string().optional(),
  zoomClientId: z.string().nullable().optional(),
  zoomClientSecret: z.string().optional(),
  zapierSigningSecret: z.string().optional(),
  zapierEnabled: z.boolean().optional(),
  aiProvider: z
    .union([z.enum(["openai", "groq", "template"]), z.string()])
    .optional()
    .transform((v) =>
      v === "openai" || v === "groq" || v === "template" ? v : undefined,
    ),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().nullable().optional(),
  groqApiKey: z.string().optional(),
  groqModel: z.string().nullable().optional(),
  maintenanceMode: z.boolean().optional(),
  supportEmail: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(", ")}`)
        .join("; ") || flat.formErrors.join("; ");
    return NextResponse.json(
      { error: first ? `Invalid settings: ${first}` : "Invalid settings payload", details: flat },
      { status: 400 },
    );
  }

  try {
    await updatePlatformSettings(parsed.data);
    const settings = await getPlatformPublicSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save settings — is the database up?" }, { status: 503 });
  }
}
