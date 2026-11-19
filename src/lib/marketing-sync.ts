import { pushAppleCalendarEvent } from "@/lib/apple-caldav";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type BookingMarketingInput = {
  siteId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  reference: string;
  startsAt: Date;
};

async function integration(siteId: string, provider: string) {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId, provider } },
  });
  if (!row || row.status !== "connected" || !row.accessTokenEncrypted) return null;
  const token = decryptSecret(row.accessTokenEncrypted);
  if (!token) return null;
  return { token, meta: row.meta as Record<string, unknown> | null, email: row.externalAccountEmail };
}

/** Push new booking contacts into HubSpot / Mailchimp when connected. */
export async function syncBookingMarketing(input: BookingMarketingInput) {
  const results: string[] = [];

  const hubspot = await integration(input.siteId, "hubspot");
  if (hubspot) {
    try {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubspot.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            email: input.customerEmail,
            firstname: input.customerName.split(" ")[0] || input.customerName,
            lastname: input.customerName.split(" ").slice(1).join(" ") || "",
            phone: input.customerPhone || "",
            hs_lead_status: "NEW",
          },
        }),
      });
      // 409 = already exists — still success for our purposes
      if (res.ok || res.status === 409) results.push("hubspot");
      else console.error("[marketing:hubspot]", await res.text());
    } catch (e) {
      console.error("[marketing:hubspot]", e);
    }
  }

  const mailchimp = await integration(input.siteId, "mailchimp");
  if (mailchimp) {
    try {
      const audienceId = String(mailchimp.meta?.audienceId || "");
      const oauthDc = typeof mailchimp.meta?.dc === "string" ? mailchimp.meta.dc : "";
      const apiEndpoint =
        typeof mailchimp.meta?.apiEndpoint === "string"
          ? mailchimp.meta.apiEndpoint.replace(/\/$/, "")
          : "";
      // API key format: {key}-{dc} · OAuth uses meta.dc + OAuth auth header
      const parts = mailchimp.token.split("-");
      const keyDc = parts.length > 1 ? parts[parts.length - 1] : "";
      const dc = oauthDc || keyDc || "us1";
      const base = apiEndpoint || `https://${dc}.api.mailchimp.com`;
      const authHeader = oauthDc || apiEndpoint
        ? `OAuth ${mailchimp.token}`
        : `Bearer ${mailchimp.token}`;
      if (audienceId) {
        const res = await fetch(
          `${base}/3.0/lists/${encodeURIComponent(audienceId)}/members`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email_address: input.customerEmail,
              status: "subscribed",
              merge_fields: {
                FNAME: input.customerName.split(" ")[0] || input.customerName,
                LNAME: input.customerName.split(" ").slice(1).join(" ") || "",
              },
              tags: ["slotwise-booking", input.serviceName.slice(0, 40)],
            }),
          },
        );
        if (res.ok || res.status === 400) results.push("mailchimp");
        else console.error("[marketing:mailchimp]", await res.text());
      }
    } catch (e) {
      console.error("[marketing:mailchimp]", e);
    }
  }

  // Apple Calendar / iCloud — verified CalDAV VEVENT PUT
  const apple = await integration(input.siteId, "apple_calendar");
  if (apple?.email) {
    try {
      const endsAt = new Date(input.startsAt.getTime() + 60 * 60 * 1000);
      const pushed = await pushAppleCalendarEvent({
        appleId: apple.email,
        appPassword: apple.token,
        calDavUrl: String(apple.meta?.calDavUrl || "https://caldav.icloud.com"),
        calendarHome: typeof apple.meta?.principalUrl === "string" ? apple.meta.principalUrl : null,
        uid: `${input.reference.replace(/\W/g, "")}@slotwise`,
        summary: `${input.serviceName} · ${input.customerName}`,
        description: `Booking ${input.reference}`,
        startsAt: input.startsAt,
        endsAt,
      });
      if (pushed.ok) results.push("apple_calendar");
      else console.error("[marketing:apple]", pushed.detail);
    } catch (e) {
      console.error("[marketing:apple]", e);
    }
  }

  return results;
}
