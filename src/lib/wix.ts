/**
 * Wix App helpers (Phase 3). Parallel to src/lib/webflow.ts — do not import Webflow OAuth here.
 * Install flow: external app-installer → callback (instanceId) → oauth2 client_credentials token.
 */

import { createPublicKey, createVerify } from "crypto";
import { getPlatformSecrets } from "@/lib/platform-config";

const WIX_APP_INSTALLER = "https://www.wix.com/app-installer";
const WIX_OAUTH_TOKEN = "https://www.wixapis.com/oauth2/token";
const WIX_API = "https://www.wixapis.com";

export type WixAccessToken = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type WixSiteProperties = {
  siteDisplayName?: string | null;
  timeZone?: string | null;
};

/** Re-export origin helper locally so Wix routes need not import webflow.ts. */
export function appOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://slotwise.hindaralabs.com";
  return raw.replace(/\/$/, "");
}

export function wixRedirectUri() {
  return (
    process.env.WIX_REDIRECT_URI?.trim().replace(/\/$/, "") ||
    `${appOrigin()}/api/wix/callback`
  );
}

export async function wixConfigured() {
  const secrets = await getPlatformSecrets();
  return Boolean(secrets.wixAppId?.trim() && secrets.wixAppSecret?.trim());
}

export async function getWixAppCredentials() {
  const secrets = await getPlatformSecrets();
  const appId = secrets.wixAppId?.trim() || process.env.WIX_APP_ID?.trim() || "";
  const appSecret =
    secrets.wixAppSecret?.trim() || process.env.WIX_APP_SECRET?.trim() || "";
  const publicKey =
    secrets.wixPublicKey?.trim() || process.env.WIX_PUBLIC_KEY?.trim() || "";
  if (!appId || !appSecret) {
    throw new Error("Wix App ID / App Secret missing — set Platform → Settings → Wix app");
  }
  return { appId, appSecret, publicKey };
}

/**
 * External install URL (Wix App Market / button).
 * Dev Center: set App URL / install to https://slotwise.hindaralabs.com/api/wix/install
 */
export async function getWixInstallUrl(state?: string) {
  const { appId } = await getWixAppCredentials();
  const post = new URL(wixRedirectUri());
  if (state) post.searchParams.set("state", state);
  // URLSearchParams encodes once — do not double-encode postInstallationUrl.
  const url = new URL(WIX_APP_INSTALLER);
  url.searchParams.set("appId", appId);
  url.searchParams.set("postInstallationUrl", post.toString());
  return url.toString();
}

/**
 * Verify Wix signedInstance when a public key is configured.
 * Format is typically signature.payload (base64url). Without a public key we only
 * accept instanceId in development-style installs and log a warning.
 */
export function verifyWixSignedInstance(
  signedInstance: string | null | undefined,
  publicKeyPem: string | null | undefined,
): { instanceId?: string; ok: boolean } {
  if (!signedInstance) return { ok: false };
  const parts = signedInstance.split(".");
  if (parts.length < 2) return { ok: false };

  try {
    const payloadB64 = parts[parts.length - 1];
    const sigB64 = parts[0];
    const payloadJson = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    );
    const payload = JSON.parse(payloadJson) as { instanceId?: string; instance_id?: string };
    const instanceId = payload.instanceId || payload.instance_id;

    if (!publicKeyPem?.trim()) {
      console.warn("[wix] signedInstance accepted without public key verify — set Wix public key");
      return { instanceId, ok: Boolean(instanceId) };
    }

    const verifier = createVerify("RSA-SHA256");
    verifier.update(payloadB64);
    verifier.end();
    const key = createPublicKey(publicKeyPem.includes("BEGIN") ? publicKeyPem : `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`);
    const sig = Buffer.from(sigB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const ok = verifier.verify(key, sig);
    return { instanceId, ok: ok && Boolean(instanceId) };
  } catch (e) {
    console.error("[wix] signedInstance verify failed", e);
    return { ok: false };
  }
}

export async function createWixAccessToken(instanceId: string): Promise<WixAccessToken> {
  const { appId, appSecret } = await getWixAppCredentials();
  const res = await fetch(WIX_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: appId,
      client_secret: appSecret,
      instance_id: instanceId,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as WixAccessToken & { message?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || data.error || `Wix token failed (${res.status})`);
  }
  return data;
}

export async function fetchWixSiteProperties(accessToken: string): Promise<WixSiteProperties | null> {
  try {
    const res = await fetch(`${WIX_API}/site-properties/v4/properties`, {
      headers: { Authorization: accessToken },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      properties?: { siteDisplayName?: string; timeZone?: string };
    };
    return {
      siteDisplayName: data.properties?.siteDisplayName ?? null,
      timeZone: data.properties?.timeZone ?? null,
    };
  } catch {
    return null;
  }
}
