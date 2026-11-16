/**
 * Webflow Hybrid App helpers.
 * Real OAuth + Custom Code API calls activate once WEBFLOW_CLIENT_* env vars are set.
 */

const WEBFLOW_AUTH = "https://webflow.com/oauth/authorize";
const WEBFLOW_TOKEN = "https://api.webflow.com/oauth/access_token";
const WEBFLOW_API = "https://api.webflow.com/v2";

export function webflowConfigured() {
  return Boolean(process.env.WEBFLOW_CLIENT_ID && process.env.WEBFLOW_CLIENT_SECRET);
}

export function getWebflowAuthorizeUrl(state: string) {
  const clientId = process.env.WEBFLOW_CLIENT_ID;
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("WEBFLOW_CLIENT_ID / WEBFLOW_REDIRECT_URI missing");
  }

  const scopes = [
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

  const url = new URL(WEBFLOW_AUTH);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeWebflowCode(code: string) {
  const res = await fetch(WEBFLOW_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.WEBFLOW_CLIENT_ID,
      client_secret: process.env.WEBFLOW_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.WEBFLOW_REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webflow token exchange failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
  }>;
}

export async function registerHostedWidgetScript(accessToken: string, siteId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const sourceCode = `(()=>{var s=document.createElement('script');s.src='${appUrl}/embed/widget.js';s.async=true;s.dataset.slotwise='1';document.body.appendChild(s);})();`;

  // Inline scripts are limited; for production register a hosted script URL instead.
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `<div data-slotwise-widget data-site="${publicKey}"></div>\n<script src="${appUrl}/embed/widget.js" async></script>`;
}
