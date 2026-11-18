import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const WEBFLOW_API = "https://api.webflow.com/v2";

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

/** Remove site-level custom code this app applied. */
export async function deleteSiteCustomCode(accessToken: string, webflowSiteId: string) {
  const res = await wfFetch(`/sites/${webflowSiteId}/custom_code`, accessToken, {
    method: "DELETE",
  });
  return res.ok || res.status === 404;
}

/** Remove page-level custom code this app applied on every page. */
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

export async function pingWebflowSite(accessToken: string, webflowSiteId: string) {
  const res = await wfFetch(`/sites/${webflowSiteId}`, accessToken);
  return res.ok;
}

/**
 * Full uninstall cleanup while we still have (or just lost) OAuth access.
 * - Strip App custom code from site + pages (when token works)
 * - Mark Slotwise site inactive so embeds collapse
 * - Delete stored Webflow token
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
  if (access && site.webflowSiteId) {
    try {
      customCodeCleared = await deleteSiteCustomCode(access, site.webflowSiteId);
      await deleteAllPageCustomCode(access, site.webflowSiteId);
      customCodeCleared = true;
    } catch (e) {
      console.error("[webflow-uninstall] custom code", e);
    }
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
        },
      },
    }),
  ]);

  return {
    ok: true as const,
    publicKey: site.publicKey,
    webflowSiteId: site.webflowSiteId,
    customCodeCleared,
  };
}

/**
 * If Webflow OAuth was revoked (app uninstalled), deactivate the Slotwise site
 * so leftover iframes/scripts stop showing a live booking widget.
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
  const stale = Date.now() - checkedAt > 6 * 60 * 60 * 1000; // 6h
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
