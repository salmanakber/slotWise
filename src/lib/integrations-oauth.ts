import { randomBytes } from "crypto";
import { getPlatformSecrets } from "@/lib/platform-config";
import { appOrigin } from "@/lib/webflow";

export const INTEGRATION_PROVIDERS = [
  "google_calendar",
  "outlook",
  "zapier",
  "zoom",
  "meet",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type OAuthProvider = "google" | "microsoft" | "zoom";

/** Map SiteIntegration.provider → OAuth app family. */
export function oauthFamily(provider: IntegrationProvider): OAuthProvider | null {
  if (provider === "google_calendar" || provider === "meet") return "google";
  if (provider === "outlook") return "microsoft";
  if (provider === "zoom") return "zoom";
  return null;
}

export function normalizeIntegrationProvider(raw: string): IntegrationProvider | null {
  const p = raw.trim().toLowerCase();
  if (p === "google" || p === "google_calendar") return "google_calendar";
  if (p === "microsoft" || p === "outlook") return "outlook";
  if (p === "zapier" || p === "make") return "zapier";
  if (p === "zoom") return "zoom";
  if (p === "meet" || p === "google_meet") return "meet";
  return null;
}

/** Path segment for callback routes (google | microsoft | zoom | meet). */
export function callbackProviderParam(provider: IntegrationProvider): string {
  if (provider === "google_calendar") return "google";
  if (provider === "outlook") return "microsoft";
  if (provider === "meet") return "meet";
  return provider;
}

export function oauthRedirectUri(callbackProvider: string) {
  return `${appOrigin()}/api/site/integrations/oauth/${callbackProvider}/callback`;
}

export function encodeOAuthState(siteId: string, provider: IntegrationProvider) {
  const payload = {
    siteId,
    provider,
    n: randomBytes(8).toString("hex"),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeOAuthState(state: string): { siteId: string; provider: IntegrationProvider } | null {
  try {
    const json = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      siteId?: string;
      provider?: string;
    };
    if (!json.siteId || !json.provider) return null;
    const provider = normalizeIntegrationProvider(json.provider);
    if (!provider) return null;
    return { siteId: json.siteId, provider };
  } catch {
    return null;
  }
}

export async function platformKeysConfigured(provider: IntegrationProvider) {
  const secrets = await getPlatformSecrets();
  const family = oauthFamily(provider);
  if (family === "google") {
    return Boolean(secrets.googleClientId?.trim() && secrets.googleClientSecret?.trim());
  }
  if (family === "microsoft") {
    return Boolean(secrets.microsoftClientId?.trim() && secrets.microsoftClientSecret?.trim());
  }
  if (family === "zoom") {
    return Boolean(secrets.zoomClientId?.trim() && secrets.zoomClientSecret?.trim());
  }
  return true; // zapier needs no OAuth app keys to create a webhook URL
}

export async function buildAuthorizeUrl(siteId: string, provider: IntegrationProvider) {
  const secrets = await getPlatformSecrets();
  const state = encodeOAuthState(siteId, provider);
  const family = oauthFamily(provider);
  if (!family) throw new Error("Provider does not use OAuth");

  if (family === "google") {
    const clientId = secrets.googleClientId?.trim();
    if (!clientId || !secrets.googleClientSecret?.trim()) {
      throw new Error("Google Client ID/Secret missing");
    }
    const redirectUri = oauthRedirectUri(callbackProviderParam(provider));
    const scopes =
      provider === "meet"
        ? [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
          ]
        : [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
          ];
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (family === "microsoft") {
    const clientId = secrets.microsoftClientId?.trim();
    if (!clientId || !secrets.microsoftClientSecret?.trim()) {
      throw new Error("Microsoft Client ID/Secret missing");
    }
    const redirectUri = oauthRedirectUri("microsoft");
    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", "offline_access Calendars.ReadWrite User.Read");
    url.searchParams.set("state", state);
    return url.toString();
  }

  // zoom — scopes must also be enabled on the Zoom Marketplace app
  const clientId = secrets.zoomClientId?.trim();
  if (!clientId || !secrets.zoomClientSecret?.trim()) {
    throw new Error("Zoom Client ID/Secret missing");
  }
  const redirectUri = oauthRedirectUri("zoom");
  const url = new URL("https://zoom.us/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  // Classic Zoom scopes (must match what’s enabled on the Marketplace app)
  url.searchParams.set("scope", "meeting:write user:read");
  url.searchParams.set("state", state);
  return url.toString();
}

export type TokenExchangeResult = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  email?: string | null;
  raw?: Record<string, unknown>;
};

export async function exchangeOAuthCode(
  provider: IntegrationProvider,
  code: string,
): Promise<TokenExchangeResult> {
  const secrets = await getPlatformSecrets();
  const family = oauthFamily(provider);
  if (!family) throw new Error("Provider does not use OAuth");

  if (family === "google") {
    const clientId = secrets.googleClientId?.trim() || "";
    const clientSecret = secrets.googleClientSecret?.trim() || "";
    const redirectUri = oauthRedirectUri(callbackProviderParam(provider));
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        typeof data.error_description === "string"
          ? data.error_description
          : "Google token exchange failed",
      );
    }
    const accessToken = String(data.access_token || "");
    let email: string | null = null;
    try {
      const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (me.ok) {
        const profile = (await me.json()) as { email?: string };
        email = profile.email || null;
      }
    } catch {
      /* optional */
    }
    return {
      accessToken,
      refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
      email,
      raw: data,
    };
  }

  if (family === "microsoft") {
    const clientId = secrets.microsoftClientId?.trim() || "";
    const clientSecret = secrets.microsoftClientSecret?.trim() || "";
    const redirectUri = oauthRedirectUri("microsoft");
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "offline_access Calendars.ReadWrite User.Read",
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        typeof data.error_description === "string"
          ? data.error_description
          : "Microsoft token exchange failed",
      );
    }
    const accessToken = String(data.access_token || "");
    let email: string | null = null;
    try {
      const me = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (me.ok) {
        const profile = (await me.json()) as { mail?: string; userPrincipalName?: string };
        email = profile.mail || profile.userPrincipalName || null;
      }
    } catch {
      /* optional */
    }
    return {
      accessToken,
      refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
      email,
      raw: data,
    };
  }

  // zoom
  const clientId = secrets.zoomClientId?.trim() || "";
  const clientSecret = secrets.zoomClientSecret?.trim() || "";
  const redirectUri = oauthRedirectUri("zoom");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof data.reason === "string"
        ? data.reason
        : typeof data.error === "string"
          ? data.error
          : "Zoom token exchange failed",
    );
  }
  const accessToken = String(data.access_token || "");
  let email: string | null = null;
  try {
    const me = await fetch("https://api.zoom.us/v2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (me.ok) {
      const profile = (await me.json()) as { email?: string };
      email = profile.email || null;
    }
  } catch {
    /* optional */
  }
  return {
    accessToken,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
    email,
    raw: data,
  };
}

/** Refresh an access token using the stored refresh token. */
export async function refreshOAuthAccessToken(
  provider: IntegrationProvider,
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}> {
  const secrets = await getPlatformSecrets();
  const family = oauthFamily(provider);
  if (!family) throw new Error("Provider does not use OAuth");

  if (family === "google") {
    const clientId = secrets.googleClientId?.trim() || "";
    const clientSecret = secrets.googleClientSecret?.trim() || "";
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !data.access_token) {
      throw new Error(
        typeof data.error_description === "string"
          ? data.error_description
          : "Google token refresh failed — reconnect Google Meet in Integrations",
      );
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
    };
  }

  if (family === "microsoft") {
    const clientId = secrets.microsoftClientId?.trim() || "";
    const clientSecret = secrets.microsoftClientSecret?.trim() || "";
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "offline_access Calendars.ReadWrite User.Read",
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !data.access_token) {
      throw new Error(
        typeof data.error_description === "string"
          ? data.error_description
          : "Outlook token refresh failed — reconnect in Integrations",
      );
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
    };
  }

  // zoom
  const clientId = secrets.zoomClientId?.trim() || "";
  const clientSecret = secrets.zoomClientSecret?.trim() || "";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    throw new Error(
      typeof data.reason === "string"
        ? data.reason
        : "Zoom token refresh failed — reconnect Zoom in Integrations",
    );
  }
  return {
    accessToken: String(data.access_token),
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
  };
}

export function missingKeysHint(provider: IntegrationProvider) {
  if (provider === "zapier") return "Coming soon";
  const family = oauthFamily(provider);
  if (family === "google") return "Google Calendar isn’t set up for your account yet";
  if (family === "microsoft") return "Outlook isn’t set up for your account yet";
  if (family === "zoom") return "Zoom isn’t set up for your account yet";
  return "This connection isn’t available yet";
}
