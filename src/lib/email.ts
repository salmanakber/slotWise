/**
 * Email delivery stub — swap Postmark/Resend when tokens exist.
 * Always log in development so booking confirmations are visible without a provider.
 */
export async function sendBookingConfirmation(input: {
  to: string;
  reference: string;
  serviceName: string;
  whenLabel: string;
  manageUrl: string;
  businessName: string;
}) {
  const subject = `${input.businessName}: booking ${input.reference} confirmed`;
  const body = [
    `Hi, your ${input.serviceName} is booked for ${input.whenLabel}.`,
    `Manage or cancel (no login): ${input.manageUrl}`,
    `— ${input.businessName} via Slotwise`,
  ].join("\n");

  if (!process.env.POSTMARK_API_TOKEN) {
    console.info("[email:dev]", { to: input.to, subject, body });
    return { queued: false, mode: "log" as const };
  }

  // Provider wiring lands with POSTMARK_API_TOKEN
  console.info("[email:postmark-ready]", { to: input.to, subject });
  return { queued: true, mode: "postmark" as const };
}
