import { getPlatformSecrets } from "@/lib/platform-config";

type SendResult = {
  queued: boolean;
  mode: "log" | "twilio" | "meta" | "openwa" | "error";
};

async function twilioMessage(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<{ ok: boolean; text: string }> {
  const auth = Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString("base64");
  const params = new URLSearchParams({
    To: opts.to,
    From: opts.from,
    Body: opts.body,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );
  const text = await res.text();
  return { ok: res.ok, text };
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");
}

function toDigits(phone: string) {
  return normalizePhone(phone).replace(/\D/g, "");
}

/** Send an SMS via Twilio when platform admin credentials are set. */
export async function sendSms(input: { to: string; body: string }): Promise<SendResult> {
  const secrets = await getPlatformSecrets();
  if (!secrets.twilioAccountSid || !secrets.twilioAuthToken || !secrets.twilioFromNumber) {
    console.info("[sms:dev]", input);
    return { queued: false, mode: "log" };
  }

  try {
    const result = await twilioMessage({
      accountSid: secrets.twilioAccountSid,
      authToken: secrets.twilioAuthToken,
      from: secrets.twilioFromNumber,
      to: normalizePhone(input.to),
      body: input.body,
    });
    if (!result.ok) {
      console.error("[sms:twilio]", result.text);
      return { queued: false, mode: "error" };
    }
    return { queued: true, mode: "twilio" };
  } catch (e) {
    console.error("[sms:twilio]", e);
    return { queued: false, mode: "error" };
  }
}

async function sendWhatsAppTwilio(input: {
  to: string;
  body: string;
  accountSid: string;
  authToken: string;
  from: string;
}): Promise<SendResult> {
  const toRaw = normalizePhone(input.to);
  const to = `whatsapp:${toRaw}`;
  const from = input.from.startsWith("whatsapp:") ? input.from : `whatsapp:${input.from}`;
  try {
    const result = await twilioMessage({
      accountSid: input.accountSid,
      authToken: input.authToken,
      from,
      to,
      body: input.body,
    });
    if (!result.ok) {
      console.error("[whatsapp:twilio]", result.text);
      return { queued: false, mode: "error" };
    }
    return { queued: true, mode: "twilio" };
  } catch (e) {
    console.error("[whatsapp:twilio]", e);
    return { queued: false, mode: "error" };
  }
}

/** Meta WhatsApp Cloud API (official). */
async function sendWhatsAppMeta(input: {
  to: string;
  body: string;
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}): Promise<SendResult> {
  const version = input.apiVersion || "v21.0";
  const to = toDigits(input.to);
  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(input.phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: false, body: input.body },
        }),
      },
    );
    if (!res.ok) {
      console.error("[whatsapp:meta]", await res.text());
      return { queued: false, mode: "error" };
    }
    return { queued: true, mode: "meta" };
  } catch (e) {
    console.error("[whatsapp:meta]", e);
    return { queued: false, mode: "error" };
  }
}

/**
 * OpenWA self-hosted gateway (unofficial WhatsApp Web bridge).
 * Default: POST {baseUrl}/api/sendText with X-API-Key.
 * @see https://docs.open-wa.org/
 */
async function sendWhatsAppOpenWa(input: {
  to: string;
  body: string;
  baseUrl: string;
  apiKey: string;
  sessionId: string;
}): Promise<SendResult> {
  const base = input.baseUrl.replace(/\/$/, "");
  const digits = toDigits(input.to);
  const chatId = digits.includes("@") ? digits : `${digits}@c.us`;
  try {
    const res = await fetch(`${base}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": input.apiKey,
      },
      body: JSON.stringify({
        sessionId: input.sessionId,
        session: input.sessionId,
        to: chatId,
        chatId,
        text: input.body,
        content: input.body,
        message: input.body,
      }),
    });
    if (!res.ok) {
      console.error("[whatsapp:openwa]", await res.text());
      return { queued: false, mode: "error" };
    }
    return { queued: true, mode: "openwa" };
  } catch (e) {
    console.error("[whatsapp:openwa]", e);
    return { queued: false, mode: "error" };
  }
}

/**
 * WhatsApp confirmation — routes by platform whatsappProvider:
 * twilio (default) | meta (Cloud API) | openwa (self-hosted).
 */
export async function sendWhatsApp(input: { to: string; body: string }): Promise<SendResult> {
  const secrets = await getPlatformSecrets();
  const provider = (secrets.whatsappProvider || "twilio").toLowerCase();

  if (provider === "meta") {
    if (!secrets.metaWhatsappPhoneNumberId || !secrets.metaWhatsappAccessToken) {
      console.info("[whatsapp:meta:dev]", input);
      return { queued: false, mode: "log" };
    }
    return sendWhatsAppMeta({
      to: input.to,
      body: input.body,
      phoneNumberId: secrets.metaWhatsappPhoneNumberId,
      accessToken: secrets.metaWhatsappAccessToken,
      apiVersion: secrets.metaWhatsappApiVersion || "v21.0",
    });
  }

  if (provider === "openwa") {
    if (!secrets.openwaBaseUrl || !secrets.openwaApiKey) {
      console.info("[whatsapp:openwa:dev]", input);
      return { queued: false, mode: "log" };
    }
    return sendWhatsAppOpenWa({
      to: input.to,
      body: input.body,
      baseUrl: secrets.openwaBaseUrl,
      apiKey: secrets.openwaApiKey,
      sessionId: secrets.openwaSessionId || "default",
    });
  }

  // Twilio WhatsApp (default)
  const from = secrets.twilioWhatsappFrom?.trim();
  if (!secrets.twilioAccountSid || !secrets.twilioAuthToken || !from) {
    console.info("[whatsapp:twilio:dev]", input);
    return { queued: false, mode: "log" };
  }
  return sendWhatsAppTwilio({
    to: input.to,
    body: input.body,
    accountSid: secrets.twilioAccountSid,
    authToken: secrets.twilioAuthToken,
    from,
  });
}
