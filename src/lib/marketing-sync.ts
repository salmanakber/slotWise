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
      // API key format: {key}-{dc}
      const parts = mailchimp.token.split("-");
      const dc = parts.length > 1 ? parts[parts.length - 1] : "us1";
      if (audienceId) {
        const res = await fetch(
          `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(audienceId)}/members`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${mailchimp.token}`,
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

  // Apple Calendar / iCloud — best-effort CalDAV VEVENT PUT
  const apple = await integration(input.siteId, "apple_calendar");
  if (apple?.email) {
    try {
      const calDavBase = String(apple.meta?.calDavUrl || "https://caldav.icloud.com/").replace(
        /\/$/,
        "",
      );
      const uid = `${input.reference.replace(/\W/g, "")}@slotwise`;
      const stamp = input.startsAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const end = new Date(input.startsAt.getTime() + 60 * 60 * 1000)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z");
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Slotwise//EN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${stamp}`,
        `DTEND:${end}`,
        `SUMMARY:${input.serviceName} · ${input.customerName}`,
        `DESCRIPTION:Booking ${input.reference}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
      const auth = Buffer.from(`${apple.email}:${apple.token}`).toString("base64");
      // Discovery can vary; try a common home calendar path pattern
      const putUrl = `${calDavBase}/${encodeURIComponent(apple.email)}/calendars/home/${uid}.ics`;
      const res = await fetch(putUrl, {
        method: "PUT",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "text/calendar; charset=utf-8",
        },
        body: ics,
      });
      if (res.ok || res.status === 201 || res.status === 204) results.push("apple_calendar");
      else console.error("[marketing:apple]", res.status, await res.text());
    } catch (e) {
      console.error("[marketing:apple]", e);
    }
  }

  return results;
}
