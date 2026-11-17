import { PlanTier, Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  fetchWebflowAuthorizedUser,
  fetchWebflowSites,
  type WebflowAccessToken,
  type WebflowSiteSummary,
} from "@/lib/webflow";

export type ProvisionResult = {
  email: string | null;
  userId: string | null;
  sites: Array<{
    id: string;
    publicKey: string;
    name: string;
    webflowSiteId: string | null;
    shortName: string | null;
  }>;
};

function publicKeyFor(webflowSiteId: string) {
  const safe = webflowSiteId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18).toLowerCase();
  return `sw_${safe || randomBytes(4).toString("hex")}`;
}

async function ensureOwner(email: string | null | undefined, name: string | null | undefined) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return existing;

  const passwordHash = await hash(randomBytes(24).toString("hex"), 10);
  return prisma.user.create({
    data: {
      email: normalized,
      name: name?.trim() || normalized.split("@")[0],
      role: Role.WORKSPACE_OWNER,
      passwordHash,
    },
  });
}

async function ensureWorkspace(userId: string | null, siteName: string) {
  if (userId) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    if (membership) return membership.workspace;
  }

  const workspace = await prisma.workspace.create({
    data: { name: `${siteName} workspace` },
  });

  if (userId) {
    await prisma.membership.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: Role.WORKSPACE_OWNER,
      },
    });
  }

  return workspace;
}

async function upsertSiteFromWebflow(args: {
  wfSite: WebflowSiteSummary | null;
  workspaceId: string;
  token: WebflowAccessToken;
  fallbackName: string;
}) {
  const { wfSite, workspaceId, token, fallbackName } = args;
  const free = await prisma.plan.findUnique({ where: { tier: PlanTier.FREE } });
  const siteName = wfSite?.displayName || wfSite?.shortName || fallbackName;

  let site = wfSite
    ? await prisma.site.findUnique({ where: { webflowSiteId: wfSite.id } })
    : null;

  if (!site) {
    const desiredKey = publicKeyFor(wfSite?.id || randomBytes(6).toString("hex"));
    const keyTaken = await prisma.site.findUnique({ where: { publicKey: desiredKey } });
    site = await prisma.site.create({
      data: {
        publicKey: keyTaken ? `sw_${randomBytes(6).toString("hex")}` : desiredKey,
        name: siteName,
        webflowSiteId: wfSite?.id ?? null,
        webflowSiteName: siteName,
        timezone: wfSite?.timeZone || "UTC",
        workspaceId,
        planId: free?.id,
        branding: {
          create: {
            businessName: siteName,
            themeKey: "amber-light",
            accent: "#f5a000",
          },
        },
        notificationSettings: { create: {} },
        stripeAccount: { create: {} },
        services: {
          create: {
            name: "Consultation",
            description: "Book a session",
            durationMin: 30,
            priceCents: 0,
            active: true,
          },
        },
        availability: {
          create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
            dayOfWeek,
            enabled: true,
            startTime: "09:00",
            endTime: "17:00",
          })),
        },
      },
    });
  } else {
    site = await prisma.site.update({
      where: { id: site.id },
      data: {
        name: siteName,
        webflowSiteName: siteName,
        timezone: wfSite?.timeZone || site.timezone,
      },
    });
  }

  await prisma.webflowToken.upsert({
    where: { siteId: site.id },
    update: {
      accessTokenEncrypted: encryptSecret(token.access_token),
      refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    },
    create: {
      siteId: site.id,
      accessTokenEncrypted: encryptSecret(token.access_token),
      refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      scope: "SITE",
      action: "webflow.installed",
      siteId: site.id,
      meta: { webflowSiteId: wfSite?.id ?? null },
    },
  });

  return site;
}

export async function provisionWebflowInstall(token: WebflowAccessToken): Promise<ProvisionResult> {
  const [authorized, wfSites] = await Promise.all([
    fetchWebflowAuthorizedUser(token.access_token),
    fetchWebflowSites(token.access_token),
  ]);

  const email = authorized?.email ?? null;
  const name = [authorized?.firstName, authorized?.lastName].filter(Boolean).join(" ") || null;
  const user = await ensureOwner(email, name);

  const primaryName = wfSites[0]?.displayName || wfSites[0]?.shortName || "Webflow site";
  const workspace = await ensureWorkspace(user?.id ?? null, primaryName);

  const sites: ProvisionResult["sites"] = [];
  if (wfSites.length === 0) {
    const site = await upsertSiteFromWebflow({
      wfSite: null,
      workspaceId: workspace.id,
      token,
      fallbackName: primaryName,
    });
    sites.push({
      id: site.id,
      publicKey: site.publicKey,
      name: site.name,
      webflowSiteId: site.webflowSiteId,
      shortName: null,
    });
  } else {
    for (const wfSite of wfSites) {
      const site = await upsertSiteFromWebflow({
        wfSite,
        workspaceId: workspace.id,
        token,
        fallbackName: primaryName,
      });
      sites.push({
        id: site.id,
        publicKey: site.publicKey,
        name: site.name,
        webflowSiteId: site.webflowSiteId,
        shortName: wfSite.shortName || null,
      });
    }
  }

  return {
    email,
    userId: user?.id ?? null,
    sites,
  };
}
