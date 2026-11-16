import { prisma } from "@/lib/prisma";
import { entitlementsForTier } from "@/lib/plan-entitlements";

export async function findSiteForDesigner(opts: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
}) {
  if (opts.webflowSiteId) {
    const byWf = await prisma.site.findUnique({
      where: { webflowSiteId: opts.webflowSiteId },
      include: {
        plan: true,
        branding: true,
        _count: { select: { services: true, staff: true, bookings: true } },
      },
    });
    if (byWf) return byWf;
  }
  if (opts.publicKey) {
    return prisma.site.findUnique({
      where: { publicKey: opts.publicKey },
      include: {
        plan: true,
        branding: true,
        _count: { select: { services: true, staff: true, bookings: true } },
      },
    });
  }
  return null;
}

export function siteBootstrapPayload(site: NonNullable<Awaited<ReturnType<typeof findSiteForDesigner>>>) {
  const tier = site.plan?.tier ?? "FREE";
  const entitlements = entitlementsForTier(tier);
  return {
    site: {
      id: site.id,
      publicKey: site.publicKey,
      name: site.branding?.businessName || site.name,
      timezone: site.timezone,
      currency: site.currency,
      webflowSiteId: site.webflowSiteId,
      accent: site.branding?.accent ?? "#f5a000",
      themeKey: site.branding?.themeKey ?? "amber-light",
    },
    counts: site._count,
    plan: {
      tier,
      name: site.plan?.name ?? entitlements.label,
      priceMonthly: site.plan?.priceMonthly ?? 0,
    },
    entitlements,
  };
}
