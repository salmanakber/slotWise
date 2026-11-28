/**
 * Provision a Slotwise Site from a Wix App install.
 * Sets channel=WIX and stores WixToken. Never writes webflowSiteId / WebflowToken.
 */

import { PlanTier, Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  createWixAccessToken,
  fetchWixSiteProperties,
  type WixAccessToken,
} from "@/lib/wix";

export type WixProvisionResult = {
  userId: string | null;
  site: {
    id: string;
    publicKey: string;
    name: string;
    wixSiteId: string | null;
    instanceId: string;
  };
};

function publicKeyFor(seed: string) {
  const safe = seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18).toLowerCase();
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
      data: { userId, workspaceId: workspace.id, role: Role.WORKSPACE_OWNER },
    });
  }
  return workspace;
}

export async function provisionWixInstall(args: {
  instanceId: string;
  tenantId?: string | null;
  email?: string | null;
  displayName?: string | null;
}): Promise<WixProvisionResult> {
  const { instanceId, tenantId } = args;
  const token: WixAccessToken = await createWixAccessToken(instanceId);
  const props = await fetchWixSiteProperties(token.access_token);
  const siteName =
    props?.siteDisplayName?.trim() ||
    args.displayName?.trim() ||
    `Wix site ${instanceId.slice(0, 8)}`;

  const user = await ensureOwner(args.email, args.displayName);
  const workspace = await ensureWorkspace(user?.id ?? null, siteName);
  const free = await prisma.plan.findUnique({ where: { tier: PlanTier.FREE } });

  // Prefer lookup by instance, then by tenant metaSite id
  let site =
    (await prisma.site.findFirst({
      where: { wixToken: { instanceId } },
      include: { wixToken: true },
    })) ||
    (tenantId
      ? await prisma.site.findUnique({ where: { wixSiteId: tenantId } })
      : null);

  if (!site) {
    const desiredKey = publicKeyFor(tenantId || instanceId);
    const keyTaken = await prisma.site.findUnique({ where: { publicKey: desiredKey } });
    site = await prisma.site.create({
      data: {
        publicKey: keyTaken ? `sw_${randomBytes(6).toString("hex")}` : desiredKey,
        name: siteName,
        channel: "WIX",
        wixSiteId: tenantId || instanceId,
        wixSiteName: siteName,
        timezone: props?.timeZone || "UTC",
        workspaceId: workspace.id,
        planId: free?.id,
      },
    });
    await prisma.branding.create({
      data: { siteId: site.id, businessName: siteName },
    }).catch(() => undefined);
  } else {
    site = await prisma.site.update({
      where: { id: site.id },
      data: {
        channel: "WIX",
        name: siteName,
        wixSiteId: tenantId || site.wixSiteId || instanceId,
        wixSiteName: siteName,
        timezone: props?.timeZone || undefined,
      },
    });
  }

  const expiresAt =
    typeof token.expires_in === "number"
      ? new Date(Date.now() + token.expires_in * 1000)
      : null;

  await prisma.wixToken.upsert({
    where: { siteId: site.id },
    update: {
      instanceId,
      tenantId: tenantId || null,
      accessTokenEncrypted: encryptSecret(token.access_token),
      expiresAt,
      lastValidatedAt: new Date(),
    },
    create: {
      siteId: site.id,
      instanceId,
      tenantId: tenantId || null,
      accessTokenEncrypted: encryptSecret(token.access_token),
      expiresAt,
      lastValidatedAt: new Date(),
    },
  });

  return {
    userId: user?.id ?? null,
    site: {
      id: site.id,
      publicKey: site.publicKey,
      name: site.name,
      wixSiteId: site.wixSiteId,
      instanceId,
    },
  };
}

export async function deactivateWixInstance(instanceId: string) {
  const token = await prisma.wixToken.findUnique({
    where: { instanceId },
    include: { site: true },
  });
  if (!token) return { ok: false as const, reason: "not_found" };

  await prisma.site.update({
    where: { id: token.siteId },
    data: { status: "INACTIVE" },
  });
  await prisma.wixToken.delete({ where: { id: token.id } }).catch(() => undefined);
  return { ok: true as const, publicKey: token.site.publicKey };
}
