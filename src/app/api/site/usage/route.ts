import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { entitlementsForTier } from "@/lib/plan-entitlements";
import { prisma } from "@/lib/prisma";
import { requireDemoSite } from "@/lib/site-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    const entitlements = entitlementsForTier(site.plan?.tier);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [bookingsThisMonth, eventsActive, bookingsTotal] = await Promise.all([
      prisma.booking.count({
        where: {
          siteId: site.id,
          createdAt: { gte: monthStart },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.service.count({ where: { siteId: site.id, active: true } }),
      prisma.booking.count({ where: { siteId: site.id } }),
    ]);

    const bookingsLimit = entitlements.bookingsLimit;
    const eventsLimit = entitlements.eventsLimit;

    return NextResponse.json({
      siteName: site.branding?.businessName || site.name,
      planLabel: entitlements.label,
      bookings: {
        used: bookingsThisMonth,
        limit: bookingsLimit,
        total: bookingsTotal,
        label:
          bookingsLimit == null
            ? `${bookingsThisMonth} bookings this month`
            : `${bookingsThisMonth} / ${bookingsLimit} bookings this month`,
        remaining: bookingsLimit == null ? null : Math.max(0, bookingsLimit - bookingsThisMonth),
        nearlyFull:
          bookingsLimit != null && bookingsThisMonth / bookingsLimit >= 0.8,
        atLimit: bookingsLimit != null && bookingsThisMonth >= bookingsLimit,
      },
      events: {
        used: eventsActive,
        limit: eventsLimit,
        label:
          eventsLimit == null
            ? `${eventsActive} active events`
            : `${eventsActive} / ${eventsLimit} events`,
        atLimit: eventsLimit != null && eventsActive >= eventsLimit,
      },
      upgradeUrl: entitlements.upgradeUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}
