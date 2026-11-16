/**
 * Webflow Hybrid App helpers.
 * Credentials can come from platform admin settings or env.
 */

import { getPlatformSecrets } from "@/lib/platform-config";

const WEBFLOW_AUTH = "https://webflow.com/oauth/authorize";
const WEBFLOW_TOKEN = "https://api.webflow.com/oauth/access_token";
const WEBFLOW_API = "https://api.webflow.com/v2";

export type WebflowAccessToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
};

export type WebflowSiteSummary = {
  id: string;
  displayName?: string;
  shortName?: string;
  timeZone?: string;
};

export type WebflowAuthorizedUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

/** Canonical public app origin — never trust request Host for OAuth redirects. */
export function appOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://slotwise.hindaralabs.com";
  return raw.replace(/\/$/, "");
}

export function webflowRedirectUri() {
  return (
    process.env.WEBFLOW_REDIRECT_URI?.replace(/\/$/, "") ||
    `${appOrigin()}/api/webflow/callback`
  );
}

export function webflowScopes() {
  return [
    "authorized_user:read",
    "sites:read",
    "sites:write",
    "pages:read",
    "pages:write",
    "cms:read",
    "cms:write",
    "custom_code:read",
    "custom_code:write",
  ].join(" ");
}

/** Marketplace Install URL — send site owners here (no Slotwise login). */
export function webflowMarketplaceInstallUrl() {
  return `${appOrigin()}/api/webflow/install`;
}

export async function webflowConfigured() {
  const secrets = await getPlatformSecrets();
  return Boolean(secrets.webflowClientId && secrets.webflowClientSecret && webflowRedirectUri());
}

export async function getWebflowAuthorizeUrl(state: string) {
  const secrets = await getPlatformSecrets();
  const clientId = secrets.webflowClientId;
  const redirectUri = webflowRedirectUri();
  if (!clientId || !redirectUri) {
    throw new Error("Webflow client ID / WEBFLOW_REDIRECT_URI missing");
  }

  const url = new URL(WEBFLOW_AUTH);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", webflowScopes());
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeWebflowCode(code: string) {
  const secrets = await getPlatformSecrets();
  const res = await fetch(WEBFLOW_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: secrets.webflowClientId,
      client_secret: secrets.webflowClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: webflowRedirectUri(),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webflow token exchange failed: ${text}`);
  }
  return res.json() as Promise<WebflowAccessToken>;
}

async function wfGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${WEBFLOW_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webflow API ${path} failed: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchWebflowAuthorizedUser(accessToken: string) {
  try {
    const data = await wfGet<{
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    }>("/token/authorized_by", accessToken);
    return data as WebflowAuthorizedUser;
  } catch {
    return null;
  }
}

export async function fetchWebflowSites(accessToken: string) {
  try {
    const data = await wfGet<{ sites?: WebflowSiteSummary[] }>("/sites", accessToken);
    return data.sites ?? [];
  } catch {
    return [] as WebflowSiteSummary[];
  }
}

export async function registerHostedWidgetScript(accessToken: string, siteId: string) {
  const appUrl = appOrigin();
  const sourceCode = `(()=>{var s=document.createElement('script');s.src='${appUrl}/embed/widget.js';s.async=true;s.dataset.slotwise='1';document.body.appendChild(s);})();`;

  const res = await fetch(`${WEBFLOW_API}/sites/${siteId}/registered_scripts/inline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sourceCode,
      version: "0.1.0",
      displayName: "Slotwise Widget",
      canCopy: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Register script failed: ${text}`);
  }
  return res.json();
}

export function widgetInstallSnippet(publicKey: string) {
  const appUrl = appOrigin();
  return `<div data-slotwise-widget data-site="${publicKey}"></div>\n<script src="${appUrl}/embed/widget.js" async></script>`;
}
