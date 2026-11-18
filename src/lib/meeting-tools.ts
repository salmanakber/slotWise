import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export type MeetingToolId = "zoom" | "meet";

export type MeetingTool = {
  id: MeetingToolId;
  label: string;
};

async function tokensFor(siteId: string, provider: string) {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId, provider } },
  });
  if (!row || row.status !== "connected" || !row.accessTokenEncrypted) return null;
  const access = decryptSecret(row.accessTokenEncrypted);
  if (!access) return null;
  return {
    access,
    refresh: row.refreshTokenEncrypted ? decryptSecret(row.refreshTokenEncrypted) : null,
    row,
  };
}

/** Meeting tools the site owner has connected and ready for customers. */
export async function listMeetingTools(siteId: string): Promise<MeetingTool[]> {
  const tools: MeetingTool[] = [];
  const zoom = await tokensFor(siteId, "zoom");
  if (zoom) tools.push({ id: "zoom", label: "Zoom" });

  const meet = await tokensFor(siteId, "meet");
  const gcal = await tokensFor(siteId, "google_calendar");
  if (meet || gcal) tools.push({ id: "meet", label: "Google Meet" });

  return tools;
}

export async function createMeetingLink(input: {
  siteId: string;
  provider: MeetingToolId;
  reference: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  manageUrl: string;
}): Promise<{ meetingUrl: string; provider: MeetingToolId }> {
  const duration = Math.max(
    15,
    Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / 60000),
  );

  if (input.provider === "zoom") {
    const zoom = await tokensFor(input.siteId, "zoom");
    if (!zoom) throw new Error("Zoom is not connected");
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
        duration,
        timezone: input.timezone,
        settings: { join_before_host: true },
      }),
    });
    if (!res.ok) {
      console.error("[meeting:zoom]", await res.text());
      throw new Error("Could not create Zoom meeting");
    }
    const data = (await res.json()) as { join_url?: string };
    if (!data.join_url) throw new Error("Zoom did not return a join link");
    return { meetingUrl: data.join_url, provider: "zoom" };
  }

  // Google Meet via Calendar event
  const meet = await tokensFor(input.siteId, "meet");
  const gcal = await tokensFor(input.siteId, "google_calendar");
  const googleToken = meet?.access || gcal?.access;
  if (!googleToken) throw new Error("Google Meet is not connected");

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
    conferenceData: {
      createRequest: {
        requestId: `slotwise-${input.reference.replace(/\W/g, "")}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("conferenceDataVersion", "1");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${googleToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("[meeting:meet]", await res.text());
    throw new Error("Could not create Google Meet");
  }
  const data = (await res.json()) as {
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  };
  const meetingUrl =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
    null;
  if (!meetingUrl) throw new Error("Google Meet link was not created");
  return { meetingUrl, provider: "meet" };
}
