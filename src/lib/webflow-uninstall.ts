import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getPlatformSecrets } from "@/lib/platform-config";

const WEBFLOW_API = "https://api.webflow.com/v2";
const WEBFLOW_REVOKE = "https://webflow.com/oauth/revoke_authorization";

async function wfFetch(path: string, accessToken: string, init?: RequestInit) {
  return fetch(`${WEBFLOW_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
      ...(init?.headers || {}),
    },
  });
}

/**
 * Marketplace rule: on uninstall, remove Custom Code the App applied at site + page
 * level. Do NOT leave replacement / “tombstone” scripts — that fails review.
 * @see https://developers.webflow.com/apps/docs/marketplace-guidelines
 * @see https://developers.webflow.com/data/docs/working-with-custom-code
 */
export async function deleteSiteCustomCode(accessToken: string, webflowSiteId: string) {
  const del = await wfFetch(`/sites/${webflowSiteId}/custom_code`, accessToken, {
    method: "DELETE",
  });
  // Belt-and-suspenders: empty apply list so nothing from this App stays applied
  const empty = await wfFetch(`/sites/${webflowSiteId}/custom_code`, accessToken, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scripts: [] }),
  });
  return (del.ok || del.status === 404) && (empty.ok || empty.status === 404 || empty.status === 400);
}

/** Remove page-level custom code this App applied on every page. */
export async function deleteAllPageCustomCode(accessToken: string, webflowSiteId: string) {
  const pagesRes = await wfFetch(`/sites/${webflowSiteId}/pages`, accessToken);
  if (!pagesRes.ok) return 0;
  const data = (await pagesRes.json()) as { pages?: Array<{ id: string }> };
  let removed = 0;
  for (const page of data.pages || []) {
    const res = await wfFetch(`/pages/${page.id}/custom_code`, accessToken, {
      method: "DELETE",
    });
    if (res.ok || res.status === 404) removed += 1;
  }
  return removed;
}

/** Strip every script this App applied (site + all pages). */
export async function purgeAppCustomCode(accessToken: string, webflowSiteId: string) {
  const pagesCleared = await deleteAllPageCustomCode(accessToken, webflowSiteId);
  const siteCleared = await deleteSiteCustomCode(accessToken, webflowSiteId);
  return { pagesCleared, siteCleared };
}

export async function pingWebflowSite(accessToken: string, webflowSiteId: string) {
  const res = await wfFetch(`/sites/${webflowSiteId}`, accessToken);
  return res.ok;
}

/** Revoke the OAuth token at Webflow after cleanup (Marketplace token hygiene). */
export async function revokeWebflowAccessToken(accessToken: string) {
  try {
    const secrets = await getPlatformSecrets();
    const clientId = secrets.webflowClientId || process.env.WEBFLOW_CLIENT_ID || "";
    const clientSecret =
      secrets.webflowClientSecret || process.env.WEBFLOW_CLIENT_SECRET || "";
    if (!clientId || !clientSecret) return false;
    const res = await fetch(WEBFLOW_REVOKE, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        access_token: accessToken,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[webflow-uninstall] revoke", e);
    return false;
  }
}

/**
 * Compliant uninstall while OAuth still works:
 * 1. Delete App-applied custom code (site + every page) — no leftover JS
 * 2. Mark Slotwise site inactive (booking embed stops serving)
 * 3. Revoke + delete stored Webflow token
 *
 * Designer canvas iframes are NOT Data API resources — remove them via Designer API
 * before calling this (see designer-extension disconnect). Owner must Publish so
 * custom-code removal goes live.
 */
export async function uninstallSlotwiseFromWebflowSite(opts: {
  siteId: string;
  accessToken?: string | null;
  reason?: string;
}) {
  const site = await prisma.site.findUnique({
    where: { id: opts.siteId },
    include: { webflowToken: true },
  });
  if (!site) return { ok: false as const, error: "Site not found" };

  const access =
    opts.accessToken ||
    (site.webflowToken?.accessTokenEncrypted
      ? decryptSecret(site.webflowToken.accessTokenEncrypted)
      : null);

  let customCodeCleared = false;
  let pagesCleared = 0;
  let tokenRevoked = false;

  if (access && site.webflowSiteId) {
    try {
      const purged = await purgeAppCustomCode(access, site.webflowSiteId);
      pagesCleared = purged.pagesCleared;
      customCodeCleared = purged.siteCleared;
    } catch (e) {
      console.error("[webflow-uninstall] custom code", e);
    }
    tokenRevoked = await revokeWebflowAccessToken(access);
  }

  await prisma.$transaction([
    prisma.site.update({
      where: { id: site.id },
      data: {
        status: "INACTIVE",
        customCodeApplied: false,
      },
    }),
    prisma.webflowToken.deleteMany({ where: { siteId: site.id } }),
    prisma.auditLog.create({
      data: {
        scope: "SITE",
        action: "webflow.uninstalled",
        siteId: site.id,
        meta: {
          webflowSiteId: site.webflowSiteId,
          reason: opts.reason || "uninstall",
          customCodeCleared,
          pagesCleared,
          tokenRevoked,
        },
      },
    }),
  ]);

  return {
    ok: true as const,
    publicKey: site.publicKey,
    webflowSiteId: site.webflowSiteId,
    customCodeCleared,
    pagesCleared,
    tokenRevoked,
  };
}

/**
 * If Webflow OAuth was revoked (app uninstalled from Marketplace), deactivate
 * Slotwise so leftover iframes stop serving a live booking widget.
 * Note: without a valid token we cannot call Custom Code DELETE — Webflow removes
 * App-applied scripts on the owner’s next publish after revoke.
 */
export async function validateWebflowConnection(siteId: string, opts?: { force?: boolean }) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { webflowToken: true },
  });
  if (!site?.webflowSiteId) {
    return { connected: false as const, reason: "no_webflow_site" };
  }
  if (!site.webflowToken) {
    if (site.status === "ACTIVE") {
      await prisma.site.update({
        where: { id: site.id },
        data: { status: "INACTIVE", customCodeApplied: false },
      });
    }
    return { connected: false as const, reason: "no_token" };
  }

  const checkedAt = site.webflowToken.lastValidatedAt?.getTime() || 0;
  const stale = Date.now() - checkedAt > 10 * 60 * 1000; // 10 minutes
  if (!opts?.force && !stale && site.status === "ACTIVE") {
    return { connected: true as const, reason: "cached" };
  }

  let access: string | null = null;
  try {
    access = decryptSecret(site.webflowToken.accessTokenEncrypted);
  } catch {
    access = null;
  }
  if (!access) {
    await uninstallSlotwiseFromWebflowSite({ siteId: site.id, reason: "bad_token" });
    return { connected: false as const, reason: "bad_token" };
  }

  const alive = await pingWebflowSite(access, site.webflowSiteId).catch(() => false);
  if (!alive) {
    // Token already dead — still try cleanup path (custom code may no-op) + deactivate
    await uninstallSlotwiseFromWebflowSite({
      siteId: site.id,
      accessToken: access,
      reason: "token_revoked",
    });
    return { connected: false as const, reason: "token_revoked" };
  }

  await prisma.webflowToken.update({
    where: { siteId: site.id },
    data: { lastValidatedAt: new Date() },
  });
  if (site.status !== "ACTIVE") {
    await prisma.site.update({ where: { id: site.id }, data: { status: "ACTIVE" } });
  }
  return { connected: true as const, reason: "validated" };
}
