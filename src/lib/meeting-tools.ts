import { formatInTimeZone } from "date-fns-tz";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import {
  normalizeIntegrationProvider,
  refreshOAuthAccessToken,
  type IntegrationProvider,
} from "@/lib/integrations-oauth";
import { prisma } from "@/lib/prisma";

export type MeetingToolId = "zoom" | "meet" | "google_calendar" | "teams";

export type MeetingTool = {
  id: MeetingToolId;
  label: string;
};

type TokenBundle = {
  access: string;
  refresh: string | null;
  provider: string;
  rowId: string;
  expiresAt: number | null;
};

function metaExpiresAt(meta: unknown): number | null {
  if (!meta || typeof meta !== "object") return null;
  const v = (meta as { expiresAt?: unknown }).expiresAt;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function loadTokens(siteId: string, provider: string): Promise<TokenBundle | null> {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId, provider } },
  });
  if (
    !row ||
    (row.status !== "connected" && row.status !== "error") ||
    !row.accessTokenEncrypted
  ) {
    return null;
  }
  const access = decryptSecret(row.accessTokenEncrypted);
  if (!access) return null;
  return {
    access,
    refresh: row.refreshTokenEncrypted ? decryptSecret(row.refreshTokenEncrypted) : null,
    provider,
    rowId: row.id,
    expiresAt: metaExpiresAt(row.meta),
  };
}

async function persistRefreshed(
  bundle: TokenBundle,
  next: { accessToken: string; refreshToken: string | null; expiresIn: number | null },
) {
  const expiresAt =
    typeof next.expiresIn === "number" ? Date.now() + next.expiresIn * 1000 : Date.now() + 3_500_000;
  await prisma.siteIntegration.update({
    where: { id: bundle.rowId },
    data: {
      status: "connected",
      accessTokenEncrypted: encryptSecret(next.accessToken),
      ...(next.refreshToken
        ? { refreshTokenEncrypted: encryptSecret(next.refreshToken) }
        : {}),
      meta: {
        expiresIn: next.expiresIn,
        expiresAt,
        refreshedAt: Date.now(),
      },
    },
  });
  return next.accessToken;
}

/**
 * Return a usable access token, refreshing when expired or about to expire.
 */
export async function ensureAccessToken(
  siteId: string,
  providers: string[],
): Promise<{ access: string; provider: string } | null> {
  for (const provider of providers) {
    const bundle = await loadTokens(siteId, provider);
    if (!bundle) continue;

    const knownExpired =
      typeof bundle.expiresAt === "number" && bundle.expiresAt < Date.now() + 90_000;

    // Proactively refresh Zoom whenever we have a refresh token (Zoom access tokens are short-lived)
    const shouldRefresh =
      Boolean(bundle.refresh) && (knownExpired || provider === "zoom" || !bundle.expiresAt);

    if (bundle.refresh && shouldRefresh) {
      const normalized = normalizeIntegrationProvider(provider);
      if (normalized) {
        try {
          const refreshed = await refreshOAuthAccessToken(
            normalized as IntegrationProvider,
            bundle.refresh,
          );
          const access = await persistRefreshed(bundle, refreshed);
          return { access, provider };
        } catch (e) {
          console.error(`[oauth:refresh:${provider}]`, e);
          await prisma.siteIntegration
            .update({
              where: { id: bundle.rowId },
              data: {
                meta: {
                  expiresAt: bundle.expiresAt,
                  lastError:
                    e instanceof Error ? e.message.slice(0, 200) : "Token refresh failed",
                  needsReconnect: true,
                },
              },
            })
            .catch(() => undefined);
        }
      }
    }

    await prisma.siteIntegration
      .updateMany({
        where: { id: bundle.rowId, status: "error" },
        data: { status: "connected" },
      })
      .catch(() => undefined);

    return { access: bundle.access, provider };
  }
  return null;
}

/** Partner apps shown after booking (video + calendar). */
export async function listMeetingTools(siteId: string): Promise<MeetingTool[]> {
  const tools: MeetingTool[] = [];
  const zoom = await loadTokens(siteId, "zoom");
  if (zoom) tools.push({ id: "zoom", label: "Zoom" });

  const teams = await loadTokens(siteId, "teams");
  const outlook = await loadTokens(siteId, "outlook");
  if (teams || outlook) tools.push({ id: "teams", label: "Microsoft Teams" });

  const meet = await loadTokens(siteId, "meet");
  const gcal = await loadTokens(siteId, "google_calendar");

  if (gcal || meet) {
    tools.push({ id: "google_calendar", label: "Google Calendar" });
  }
  if (meet || gcal) {
    tools.push({ id: "meet", label: "Google Meet" });
  }

  return tools;
}

export async function hasGoogleCalendar(siteId: string) {
  return Boolean(
    (await loadTokens(siteId, "google_calendar")) || (await loadTokens(siteId, "meet")),
  );
}

async function googleFetchWithRetry(
  siteId: string,
  init: RequestInit & { url: string },
): Promise<Response> {
  const token = await ensureAccessToken(siteId, ["meet", "google_calendar"]);
  if (!token) throw new Error("Google Calendar is not connected");

  let res = await fetch(init.url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token.access}`,
    },
  });

  if (res.status === 401) {
    const bundle = await loadTokens(siteId, token.provider);
    if (bundle?.refresh) {
      const normalized = normalizeIntegrationProvider(token.provider);
      if (normalized) {
        try {
          const refreshed = await refreshOAuthAccessToken(normalized, bundle.refresh);
          const access = await persistRefreshed(bundle, refreshed);
          res = await fetch(init.url, {
            ...init,
            headers: {
              ...(init.headers || {}),
              Authorization: `Bearer ${access}`,
            },
          });
        } catch (e) {
          console.error("[meeting:google:refresh]", e);
          throw new Error(
            "Google session expired. Ask the site owner to reconnect Google Calendar in Integrations.",
          );
        }
      }
    } else {
      throw new Error(
        "Google session expired. Ask the site owner to reconnect Google Calendar in Integrations.",
      );
    }
  }

  return res;
}

function zoomLocalStart(startsAt: Date, timezone: string) {
  // Zoom wants local wall time when `timezone` is set (no trailing Z)
  try {
    return formatInTimeZone(startsAt, timezone, "yyyy-MM-dd'T'HH:mm:ss");
  } catch {
    return startsAt.toISOString().replace(/\.\d{3}Z$/, "");
  }
}

async function createZoomMeeting(input: {
  siteId: string;
  reference: string;
  customerName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}): Promise<{ meetingUrl: string; provider: "zoom" }> {
  const duration = Math.max(
    15,
    Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / 60000),
  );

  const token = await ensureAccessToken(input.siteId, ["zoom"]);
  if (!token) {
    throw new Error("Zoom is not connected. Connect Zoom under Integrations, then try again.");
  }

  const payload = {
    topic: `${input.serviceName} · ${input.customerName}`.slice(0, 200),
    type: 2 as const,
    start_time: zoomLocalStart(input.startsAt, input.timezone),
    duration,
    timezone: input.timezone || "UTC",
    settings: {
      join_before_host: true,
      waiting_room: false,
    },
  };

  async function post(access: string) {
    return fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  let res = await post(token.access);

  if (res.status === 401) {
    const bundle = await loadTokens(input.siteId, "zoom");
    if (!bundle?.refresh) {
      throw new Error(
        "Zoom session expired. Ask the site owner to reconnect Zoom in Integrations.",
      );
    }
    try {
      const refreshed = await refreshOAuthAccessToken("zoom", bundle.refresh);
      const access = await persistRefreshed(bundle, refreshed);
      res = await post(access);
    } catch (e) {
      console.error("[meeting:zoom:refresh]", e);
      throw new Error(
        "Zoom session expired. Ask the site owner to reconnect Zoom in Integrations.",
      );
    }
  }

  if (!res.ok) {
    const raw = await res.text();
    console.error("[meeting:zoom]", raw);
    let detail = "Could not create Zoom meeting";
    try {
      const parsed = JSON.parse(raw) as { message?: string; reason?: string; code?: number };
      detail = parsed.message || parsed.reason || detail;
      if (res.status === 4701 || /scope|permission|authorize/i.test(detail)) {
        detail =
          "Zoom app is missing meeting permissions. Reconnect Zoom in Integrations after updating Zoom app scopes (meeting:write).";
      }
    } catch {
      /* keep default */
    }
    if (res.status === 401) {
      detail = "Zoom session expired. Ask the site owner to reconnect Zoom in Integrations.";
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as { join_url?: string };
  if (!data.join_url) throw new Error("Zoom did not return a join link");
  return { meetingUrl: data.join_url, provider: "zoom" };
}

async function createGoogleCalendarEvent(input: {
  siteId: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  manageUrl: string;
  withMeet: boolean;
}): Promise<{ meetingUrl: string; provider: "meet" | "google_calendar" }> {
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

  if (input.withMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: `slotwise-${input.reference.replace(/\W/g, "")}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  if (input.withMeet) url.searchParams.set("conferenceDataVersion", "1");
  url.searchParams.set("sendUpdates", "all");

  const res = await googleFetchWithRetry(input.siteId, {
    url: url.toString(),
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const raw = await res.text();
    console.error("[meeting:google]", raw);
    throw new Error(
      res.status === 401
        ? "Google session expired. Ask the site owner to reconnect Google Calendar in Integrations."
        : input.withMeet
          ? "Could not create Google Meet"
          : "Could not add Google Calendar event",
    );
  }

  const data = (await res.json()) as {
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  };

  if (input.withMeet) {
    const meetingUrl =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
      null;
    if (!meetingUrl) throw new Error("Google Meet link was not created");
    return { meetingUrl, provider: "meet" };
  }

  if (!data.htmlLink) throw new Error("Google Calendar did not return an event link");
  return { meetingUrl: data.htmlLink, provider: "google_calendar" };
}

async function createTeamsMeeting(input: {
  siteId: string;
  customerName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<{ meetingUrl: string; provider: "teams" }> {
  const token = await ensureAccessToken(input.siteId, ["teams", "outlook"]);
  if (!token) {
    throw new Error(
      "Microsoft Teams is not connected. Connect Teams under Integrations, then try again.",
    );
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDateTime: input.startsAt.toISOString(),
      endDateTime: input.endsAt.toISOString(),
      subject: `${input.serviceName} · ${input.customerName}`.slice(0, 250),
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    console.error("[meeting:teams]", raw);
    throw new Error(
      res.status === 401
        ? "Teams session expired. Reconnect Microsoft Teams in Integrations."
        : "Could not create Teams meeting — reconnect Teams with OnlineMeetings permission.",
    );
  }

  const data = (await res.json()) as { joinWebUrl?: string; joinUrl?: string };
  const meetingUrl = data.joinWebUrl || data.joinUrl;
  if (!meetingUrl) throw new Error("Teams did not return a join link");
  return { meetingUrl, provider: "teams" };
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
  if (input.provider === "zoom") {
    return createZoomMeeting(input);
  }
  if (input.provider === "teams") {
    return createTeamsMeeting(input);
  }
  if (input.provider === "google_calendar") {
    return createGoogleCalendarEvent({ ...input, withMeet: false });
  }
  return createGoogleCalendarEvent({ ...input, withMeet: true });
}
