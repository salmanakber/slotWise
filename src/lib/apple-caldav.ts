/**
 * Apple iCloud CalDAV helpers — validate credentials and push booking events.
 * Apple does not offer OAuth for Calendar; an app-specific password is required.
 */

export type AppleCalDavConfig = {
  appleId: string;
  appPassword: string;
  calDavUrl?: string;
};

function basicAuth(appleId: string, appPassword: string) {
  return `Basic ${Buffer.from(`${appleId}:${appPassword}`).toString("base64")}`;
}

function normalizeBase(url?: string) {
  return (url || "https://caldav.icloud.com").replace(/\/$/, "");
}

/** Probe iCloud CalDAV — rejects fake email/password pairs. */
export async function validateAppleCalDav(
  input: AppleCalDavConfig,
): Promise<{ ok: true; principalUrl: string } | { ok: false; error: string }> {
  const appleId = input.appleId.trim().toLowerCase();
  const appPassword = input.appPassword.replace(/\s+/g, "");
  if (!appleId.includes("@")) {
    return { ok: false, error: "Enter a valid Apple ID email" };
  }
  // App-specific passwords are typically 16 letters (often shown as xxxx-xxxx-xxxx-xxxx)
  if (appPassword.length < 12) {
    return {
      ok: false,
      error: "Use an Apple app-specific password (appleid.apple.com → Sign-In and Security)",
    };
  }

  const base = normalizeBase(input.calDavUrl);
  const auth = basicAuth(appleId, appPassword);

  try {
    const res = await fetch(`${base}/`, {
      method: "PROPFIND",
      headers: {
        Authorization: auth,
        Depth: "0",
        "Content-Type": "application/xml; charset=utf-8",
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop>
</d:propfind>`,
      signal: AbortSignal.timeout(12_000),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "Apple rejected those credentials. Use your Apple ID email and an app-specific password (not your normal password).",
      };
    }
    if (!res.ok && res.status !== 207) {
      return {
        ok: false,
        error: `Could not reach iCloud Calendar (HTTP ${res.status}). Try again in a moment.`,
      };
    }

    const xml = await res.text();
    const principalMatch = xml.match(/<[^>]*current-user-principal[^>]*>[\s\S]*?<[^>]*href[^>]*>([^<]+)/i);
    const principalUrl = principalMatch?.[1]?.trim()
      ? principalMatch[1].trim().startsWith("http")
        ? principalMatch[1].trim()
        : `${base}${principalMatch[1].trim()}`
      : `${base}/`;

    return { ok: true, principalUrl };
  } catch (e) {
    console.error("[apple-caldav:validate]", e);
    return {
      ok: false,
      error: "Could not verify Apple Calendar — check your connection and try again.",
    };
  }
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildBookingIcs(input: {
  uid: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const stamp = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slotwise//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(input.endsAt)}`,
    `SUMMARY:${icsEscape(input.summary)}`,
    `DESCRIPTION:${icsEscape(input.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Best-effort PUT of a VEVENT onto the owner's iCloud calendar. */
export async function pushAppleCalendarEvent(input: {
  appleId: string;
  appPassword: string;
  calDavUrl?: string;
  calendarHome?: string | null;
  uid: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<{ ok: boolean; detail?: string }> {
  const appleId = input.appleId.trim().toLowerCase();
  const appPassword = input.appPassword.replace(/\s+/g, "");
  const base = normalizeBase(input.calDavUrl);
  const auth = basicAuth(appleId, appPassword);
  const ics = buildBookingIcs({
    uid: input.uid,
    summary: input.summary,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });

  const candidates = [
    input.calendarHome
      ? `${input.calendarHome.replace(/\/$/, "")}/${input.uid}.ics`
      : null,
    `${base}/${encodeURIComponent(appleId)}/calendars/home/${input.uid}.ics`,
    `${base}/${encodeURIComponent(appleId)}/${input.uid}.ics`,
  ].filter(Boolean) as string[];

  for (const putUrl of candidates) {
    try {
      const res = await fetch(putUrl, {
        method: "PUT",
        headers: {
          Authorization: auth,
          "Content-Type": "text/calendar; charset=utf-8",
        },
        body: ics,
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok || res.status === 201 || res.status === 204) {
        return { ok: true };
      }
    } catch {
      /* try next */
    }
  }
  return { ok: false, detail: "CalDAV PUT failed for all candidate paths" };
}
