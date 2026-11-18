import { encryptSecret, decryptSecret } from "@/lib/crypto";
import {
  normalizeIntegrationProvider,
  refreshOAuthAccessToken,
  type IntegrationProvider,
} from "@/lib/integrations-oauth";
import { prisma } from "@/lib/prisma";

export type MeetingToolId = "zoom" | "meet";

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
  if (!row || row.status !== "connected" || !row.accessTokenEncrypted) return null;
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
 * Marks the integration as error if refresh fails (owner must reconnect).
 */
export async function ensureAccessToken(
  siteId: string,
  providers: string[],
): Promise<{ access: string; provider: string } | null> {
  for (const provider of providers) {
    const bundle = await loadTokens(siteId, provider);
    if (!bundle) continue;

    // Refresh when expiry is unknown (legacy rows) or within 90s of expiring
    const needsRefresh =
      !bundle.expiresAt || bundle.expiresAt < Date.now() + 90_000;

    if (bundle.refresh && needsRefresh) {
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
                status: "error",
                meta: {
                  lastError:
                    e instanceof Error ? e.message.slice(0, 200) : "Token refresh failed",
                  needsReconnect: true,
                },
              },
            })
            .catch(() => undefined);
          continue;
        }
      }
    }

    return { access: bundle.access, provider };
  }
  return null;
}

/** Meeting tools the site owner has connected and ready for customers. */
export async function listMeetingTools(siteId: string): Promise<MeetingTool[]> {
  const tools: MeetingTool[] = [];
  const zoom = await loadTokens(siteId, "zoom");
  if (zoom) tools.push({ id: "zoom", label: "Zoom" });

  const meet = await loadTokens(siteId, "meet");
  const gcal = await loadTokens(siteId, "google_calendar");
  if (meet || gcal) tools.push({ id: "meet", label: "Google Meet" });

  return tools;
}

async function googleFetchWithRetry(
  siteId: string,
  init: RequestInit & { url: string },
): Promise<Response> {
  const token = await ensureAccessToken(siteId, ["meet", "google_calendar"]);
  if (!token) throw new Error("Google Meet is not connected");

  let res = await fetch(init.url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token.access}`,
    },
  });

  // Access token rejected — force refresh once and retry
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
          console.error("[meeting:meet:refresh]", e);
          throw new Error(
            "Google Meet session expired. Ask the site owner to reconnect Google Meet in Integrations.",
          );
        }
      }
    } else {
      throw new Error(
        "Google Meet session expired. Ask the site owner to reconnect Google Meet in Integrations.",
      );
    }
  }

  return res;
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
    const token = await ensureAccessToken(input.siteId, ["zoom"]);
    if (!token) throw new Error("Zoom is not connected");

    let res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access}`,
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

    if (res.status === 401) {
      const bundle = await loadTokens(input.siteId, "zoom");
      if (bundle?.refresh) {
        const refreshed = await refreshOAuthAccessToken("zoom", bundle.refresh);
        const access = await persistRefreshed(bundle, refreshed);
        res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access}`,
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
      }
    }

    if (!res.ok) {
      console.error("[meeting:zoom]", await res.text());
      throw new Error(
        res.status === 401
          ? "Zoom session expired. Ask the site owner to reconnect Zoom in Integrations."
          : "Could not create Zoom meeting",
      );
    }
    const data = (await res.json()) as { join_url?: string };
    if (!data.join_url) throw new Error("Zoom did not return a join link");
    return { meetingUrl: data.join_url, provider: "zoom" };
  }

  // Google Meet via Calendar event
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

  const res = await googleFetchWithRetry(input.siteId, {
    url: url.toString(),
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("[meeting:meet]", await res.text());
    throw new Error(
      res.status === 401
        ? "Google Meet session expired. Ask the site owner to reconnect Google Meet in Integrations."
        : "Could not create Google Meet",
    );
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
