import { prisma } from "@/lib/prisma";
import { entitlementsForTier } from "@/lib/plan-entitlements";
import { getPlatformPublicSettings } from "@/lib/platform-config";

const siteInclude = {
  plan: true,
  branding: true,
  stripeAccount: true,
  integrations: true,
  services: {
    where: { active: true },
    orderBy: { sortOrder: "asc" as const },
    take: 8,
    select: {
      id: true,
      name: true,
      durationMin: true,
      priceCents: true,
      color: true,
      active: true,
      featured: true,
    },
  },
  bookings: {
    orderBy: { startsAt: "desc" as const },
    take: 8,
    select: {
      id: true,
      reference: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      notes: true,
      startsAt: true,
      endsAt: true,
      amountCents: true,
      depositCents: true,
      currency: true,
      status: true,
      service: { select: { name: true } },
    },
  },
  _count: { select: { services: true, staff: true, bookings: true } },
};

export async function findSiteForDesigner(opts: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
}) {
  if (opts.webflowSiteId) {
    const byWf = await prisma.site.findUnique({
      where: { webflowSiteId: opts.webflowSiteId },
      include: siteInclude,
    });
    if (byWf) return byWf;
  }
  if (opts.publicKey) {
    return prisma.site.findUnique({
      where: { publicKey: opts.publicKey },
      include: siteInclude,
    });
  }
  return null;
}

export async function siteBootstrapPayload(
  site: NonNullable<Awaited<ReturnType<typeof findSiteForDesigner>>>,
) {
  const tier = site.plan?.tier ?? "FREE";
  const entitlements = entitlementsForTier(tier);
  const platform = await getPlatformPublicSettings();
  const byProvider = new Map(site.integrations.map((i) => [i.provider, i]));

  const appRow = (provider: string, label: string, ready: boolean) => {
    const row = byProvider.get(provider);
    const connected = row?.status === "connected";
    return {
      provider,
      label,
      connected,
      ready,
      email: row?.externalAccountEmail || null,
    };
  };

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const bookingsThisMonth = await prisma.booking.count({
    where: {
      siteId: site.id,
      createdAt: { gte: monthStart },
      status: { not: "CANCELLED" },
    },
  });

  const stripe = site.stripeAccount;
  const payments = {
    connected: Boolean(stripe?.stripeAccountId),
    chargesEnabled: Boolean(stripe?.chargesEnabled),
    payoutsEnabled: Boolean(stripe?.payoutsEnabled),
    paymentMode: stripe?.paymentMode || "PAY_ON_SITE",
    depositPercent: stripe?.depositPercent ?? 30,
    setupUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://slotwise.hindaralabs.com"}/dashboard/payments`,
  };

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
    counts: {
      ...site._count,
      bookingsThisMonth,
    },
    plan: {
      tier,
      name: site.plan?.name ?? entitlements.label,
      priceMonthly: site.plan?.priceMonthly ?? 0,
    },
    entitlements,
    payments,
    // Only surface apps that are ready from admin (or already connected)
    apps: [
      appRow(
        "google_calendar",
        "Google Calendar",
        Boolean(platform.googleClientId && platform.googleClientSecretSet),
      ),
      appRow(
        "outlook",
        "Outlook",
        Boolean(platform.microsoftClientId && platform.microsoftClientSecretSet),
      ),
      appRow("zoom", "Zoom", Boolean(platform.zoomClientId && platform.zoomClientSecretSet)),
      appRow("meet", "Google Meet", Boolean(platform.googleClientId && platform.googleClientSecretSet)),
      appRow("zapier", "Zapier", Boolean(platform.zapierEnabled)),
    ].filter((a) => a.ready || a.connected),
    activeEvents: site.services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      color: s.color,
      featured: s.featured,
    })),
    recentBookings: site.bookings.map((b) => ({
      id: b.id,
      reference: b.reference,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      notes: b.notes,
      serviceName: b.service?.name || "Booking",
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      amountCents: b.amountCents,
      depositCents: b.depositCents,
      currency: b.currency,
      status: b.status,
    })),
  };
}
