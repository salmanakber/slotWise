import { getPlatformSecrets } from "@/lib/platform-config";

/**
 * Email delivery — Postmark when a token is set in platform admin (or env).
 * Without a token, messages are logged so local booking still works.
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
  const from = secrets.emailFrom || "bookings@slotwise.hindaralabs.com";
  const subject = `${input.businessName}: booking ${input.reference} confirmed`;
  const body = [
    `Hi, your ${input.serviceName} is booked for ${input.whenLabel}.`,
    `Manage or cancel (no login): ${input.manageUrl}`,
    `— ${input.businessName} via Slotwise`,
  ].join("\n");

  if (!secrets.postmarkToken) {
    console.info("[email:dev]", { from, to: input.to, subject, body });
    return { queued: false, mode: "log" as const };
  }

  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": secrets.postmarkToken,
      },
      body: JSON.stringify({
        From: from,
        To: input.to,
        Subject: subject,
        TextBody: body,
        MessageStream: "outbound",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email:postmark]", text);
      return { queued: false, mode: "error" as const };
    }
    return { queued: true, mode: "postmark" as const };
  } catch (e) {
    console.error("[email:postmark]", e);
    return { queued: false, mode: "error" as const };
  }
}
