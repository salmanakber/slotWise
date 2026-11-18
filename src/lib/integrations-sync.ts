import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type BookingSyncInput = {
  siteId: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  manageUrl: string;
  locationType?: string | null;
};

async function tokensFor(siteId: string, provider: string) {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId, provider } },
  });
  if (!row || row.status !== "connected" || !row.accessTokenEncrypted) return null;
  const access = decryptSecret(row.accessTokenEncrypted);
  if (!access) return null;
  return { access, refresh: row.refreshTokenEncrypted ? decryptSecret(row.refreshTokenEncrypted) : null, row };
}

/**
 * Sync booking onto connected calendars.
 * Meeting links (Zoom / Meet) are created on demand when the customer picks a tool.
 */
export async function syncBookingIntegrations(input: BookingSyncInput) {
  const results: string[] = [];
  const meetingUrl: string | null = null;

  // Google Calendar (event only — Meet is customer-opt-in)
  const gcal = await tokensFor(input.siteId, "google_calendar");
  const meet = await tokensFor(input.siteId, "meet");
  const googleToken = gcal?.access || meet?.access;
  if (googleToken) {
    try {
      const body: Record<string, unknown> = {
        summary: `${input.serviceName} · ${input.customerName}`,
        description: [
          `Booking ${input.reference}`,
          `Customer: ${input.customerName} <${input.customerEmail}>`,
          `Manage: ${input.manageUrl}`,
        ].join("\n"),
        start: { dateTime: input.startsAt.toISOString(), timeZone: input.timezone },
        end: { dateTime: input.endsAt.toISOString(), timeZone: input.timezone },
        attendees: [{ email: input.customerEmail }],
      };
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        results.push(gcal ? "google_calendar" : "meet");
      } else {
        console.error("[sync:google]", await res.text());
      }
    } catch (e) {
      console.error("[sync:google]", e);
    }
  }

  // Outlook calendar
  const outlook = await tokensFor(input.siteId, "outlook");
  if (outlook) {
    try {
      const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${outlook.access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: `${input.serviceName} · ${input.customerName}`,
          body: {
            contentType: "Text",
            content: [
              `Booking ${input.reference}`,
              meetingUrl ? `Meeting: ${meetingUrl}` : null,
              `Manage: ${input.manageUrl}`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
          start: { dateTime: input.startsAt.toISOString().replace(/Z$/, ""), timeZone: "UTC" },
          end: { dateTime: input.endsAt.toISOString().replace(/Z$/, ""), timeZone: "UTC" },
          attendees: [
            {
              emailAddress: { address: input.customerEmail, name: input.customerName },
              type: "required",
            },
          ],
        }),
      });
      if (res.ok) results.push("outlook");
      else console.error("[sync:outlook]", await res.text());
    } catch (e) {
      console.error("[sync:outlook]", e);
    }
  }

  return { providers: results, meetingUrl };
}
