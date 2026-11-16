import { getPlatformSecrets } from "@/lib/platform-config";

/** Send an SMS via Twilio when platform admin credentials are set. */
export async function sendSms(input: { to: string; body: string }) {
  const secrets = await getPlatformSecrets();
  if (!secrets.twilioAccountSid || !secrets.twilioAuthToken || !secrets.twilioFromNumber) {
    console.info("[sms:dev]", input);
    return { queued: false, mode: "log" as const };
  }

  const auth = Buffer.from(`${secrets.twilioAccountSid}:${secrets.twilioAuthToken}`).toString("base64");
  const params = new URLSearchParams({
    To: input.to,
    From: secrets.twilioFromNumber,
    Body: input.body,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${secrets.twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    if (!res.ok) {
      console.error("[sms:twilio]", await res.text());
      return { queued: false, mode: "error" as const };
    }
    return { queued: true, mode: "twilio" as const };
  } catch (e) {
    console.error("[sms:twilio]", e);
    return { queued: false, mode: "error" as const };
  }
}
