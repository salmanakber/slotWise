import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export { DEMO_PUBLIC_KEY };

export async function getDemoSite() {
  try {
    return await prisma.site.findUnique({
      where: { publicKey: DEMO_PUBLIC_KEY },
      include: {
        branding: true,
        plan: true,
        workspace: true,
        services: { orderBy: { sortOrder: "asc" } },
        staff: { orderBy: { name: "asc" } },
        stripeAccount: true,
        notificationSettings: true,
        bookings: {
          include: { service: true, staff: { include: { staff: true } } },
          orderBy: { startsAt: "asc" },
          take: 50,
        },
        _count: { select: { bookings: true } },
      },
    });
  } catch {
    return null;
  }
}

export async function getSiteOverviewStats(siteId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [bookingsWeek, revenue, noShows, paid] = await Promise.all([
    prisma.booking.count({
      where: { siteId, createdAt: { gte: weekAgo }, status: { not: "CANCELLED" } },
    }),
    prisma.booking.aggregate({
      where: { siteId, status: { in: ["PAID", "DEPOSIT", "CONFIRMED", "COMPLETED"] } },
      _sum: { amountCents: true },
    }),
    prisma.booking.count({ where: { siteId, status: "NO_SHOW" } }),
    prisma.booking.count({ where: { siteId, status: { in: ["PAID", "DEPOSIT", "CONFIRMED"] } } }),
  ]);

  const total = await prisma.booking.count({ where: { siteId } });
  const noShowRate = total ? Math.round((noShows / total) * 1000) / 10 : 0;

  return {
    bookingsWeek,
    revenueCents: revenue._sum.amountCents ?? 0,
    paid,
    noShowRate,
  };
}
