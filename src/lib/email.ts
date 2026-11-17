import { DEFAULT_EMAIL_FROM } from "@/lib/brand";
import { getPlatformSecrets } from "@/lib/platform-config";

function formatFrom(displayName: string, address: string) {
  const safeName = displayName.replace(/["<>]/g, "").trim() || "Bookings";
  return `${safeName} <${address}>`;
}

/**
 * Email delivery via Resend.
 * From address must be on a domain verified in Resend.
 * Prefer site-level fromEmail → platform emailFrom → DEFAULT.
 * Reply-To prefers the site owner's inbox so customers reply to the business.
 */
export async function sendBookingConfirmation(input: {
  to: string;
  reference: string;
  serviceName: string;
  whenLabel: string;
  manageUrl: string;
  businessName: string;
  fromEmail?: string | null;
  replyToEmail?: string | null;
}) {
  const secrets = await getPlatformSecrets();
  const fromAddress =
    input.fromEmail?.trim() ||
    secrets.emailFrom?.trim() ||
    DEFAULT_EMAIL_FROM;
  const from = formatFrom(input.businessName, fromAddress);
  const replyTo = input.replyToEmail?.trim() || undefined;

  const subject = `${input.businessName}: booking ${input.reference} confirmed`;
  const body = [
    `Hi, your ${input.serviceName} is booked for ${input.whenLabel}.`,
    `Manage or cancel (no login): ${input.manageUrl}`,
    `— ${input.businessName}`,
  ].join("\n");

  const apiKey =
    secrets.resendApiKey ||
    secrets.postmarkToken ||
    process.env.RESEND_API_KEY ||
    null;

  if (!apiKey) {
    console.info("[email:dev]", { from, replyTo, to: input.to, subject, body });
    return { queued: false, mode: "log" as const };
  }

  try {
    const payload: Record<string, unknown> = {
      from,
      to: [input.to],
      subject,
      text: body,
    };
    if (replyTo) payload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email:resend]", text);
      return { queued: false, mode: "error" as const };
    }
    return { queued: true, mode: "resend" as const };
  } catch (e) {
    console.error("[email:resend]", e);
    return { queued: false, mode: "error" as const };
  }
}
