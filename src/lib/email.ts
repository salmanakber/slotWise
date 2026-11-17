import { DEFAULT_EMAIL_FROM } from "@/lib/brand";
import { getPlatformSecrets } from "@/lib/platform-config";

/**
 * Email delivery via Resend when an API key is set in platform admin (or env).
 * Without a key, messages are logged so local booking still works.
 */
export async function sendBookingConfirmation(input: {
  to: string;
  reference: string;
  serviceName: string;
  whenLabel: string;
  manageUrl: string;
  businessName: string;
}) {
  const secrets = await getPlatformSecrets();
  const from = secrets.emailFrom || DEFAULT_EMAIL_FROM;
  const subject = `${input.businessName}: booking ${input.reference} confirmed`;
  const body = [
    `Hi, your ${input.serviceName} is booked for ${input.whenLabel}.`,
    `Manage or cancel (no login): ${input.manageUrl}`,
    `— ${input.businessName} via Slotwise`,
  ].join("\n");

  const apiKey =
    secrets.resendApiKey ||
    secrets.postmarkToken ||
    process.env.RESEND_API_KEY ||
    null;

  if (!apiKey) {
    console.info("[email:dev]", { from, to: input.to, subject, body });
    return { queued: false, mode: "log" as const };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        text: body,
      }),
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
