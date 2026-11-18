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

/** Create calendar / meeting links for a new booking when apps are connected. */
export async function syncBookingIntegrations(input: BookingSyncInput) {
  const results: string[] = [];
  let meetingUrl: string | null = null;

  // Zoom meeting for online-ish bookings
  const zoom = await tokensFor(input.siteId, "zoom");
  if (zoom) {
    try {
      const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${zoom.access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: `${input.serviceName} · ${input.customerName}`,
          type: 2,
          start_time: input.startsAt.toISOString(),
          duration: Math.max(
            15,
            Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / 60000),
          ),
          timezone: input.timezone,
          settings: { join_before_host: true },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { join_url?: string };
        meetingUrl = data.join_url || null;
        results.push("zoom");
      } else {
        console.error("[sync:zoom]", await res.text());
      }
    } catch (e) {
      console.error("[sync:zoom]", e);
    }
  }

  // Google Calendar (+ optional Meet)
  const gcal = await tokensFor(input.siteId, "google_calendar");
  const meet = await tokensFor(input.siteId, "meet");
  const googleToken = gcal?.access || meet?.access;
  if (googleToken) {
    try {
      const wantsMeet = Boolean(meet) && !meetingUrl;
      const body: Record<string, unknown> = {
        summary: `${input.serviceName} · ${input.customerName}`,
        description: [
          `Booking ${input.reference}`,
          `Customer: ${input.customerName} <${input.customerEmail}>`,
          meetingUrl ? `Meeting: ${meetingUrl}` : null,
          `Manage: ${input.manageUrl}`,
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: input.startsAt.toISOString(), timeZone: input.timezone },
        end: { dateTime: input.endsAt.toISOString(), timeZone: input.timezone },
        attendees: [{ email: input.customerEmail }],
      };
      if (wantsMeet) {
        body.conferenceData = {
          createRequest: {
            requestId: `slotwise-${input.reference.replace(/\W/g, "")}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      if (wantsMeet) url.searchParams.set("conferenceDataVersion", "1");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          hangoutLink?: string;
          conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
        };
        if (!meetingUrl) {
          meetingUrl =
            data.hangoutLink ||
            data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
            null;
        }
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
