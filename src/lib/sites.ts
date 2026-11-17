import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";

export { DEMO_PUBLIC_KEY };

const REVENUE_STATUSES: BookingStatus[] = ["PAID", "DEPOSIT", "CONFIRMED", "COMPLETED"];
const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "DEPOSIT", "PAID", "COMPLETED"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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
          include: {
            service: true,
            location: true,
            staff: { include: { staff: true } },
          },
          orderBy: { startsAt: "desc" },
          take: 100,
        },
        _count: { select: { bookings: true } },
      },
    });
  } catch {
    return null;
  }
}

export async function getSiteBookings(siteId: string, take = 150) {
  return prisma.booking.findMany({
    where: { siteId },
    include: {
      service: true,
      location: true,
      staff: { include: { staff: true } },
    },
    orderBy: { startsAt: "desc" },
    take,
  });
}

export async function getSiteOverviewStats(siteId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = monthStart;
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const day14Ago = startOfDay(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000));

  const [
    bookingsWeek,
    bookingsMonth,
    bookingsUpcoming,
    bookingsToday,
    pending,
    paid,
    cancelled,
    noShows,
    total,
    revenueAll,
    revenueMonth,
    revenueLastMonth,
    revenueWeek,
    deposits,
    recentForChart,
    topRaw,
    upcoming,
  ] = await Promise.all([
    prisma.booking.count({
      where: { siteId, createdAt: { gte: weekAgo }, status: { in: ACTIVE_STATUSES } },
    }),
    prisma.booking.count({
      where: { siteId, createdAt: { gte: monthStart }, status: { in: ACTIVE_STATUSES } },
    }),
    prisma.booking.count({
      where: {
        siteId,
        startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED", "DEPOSIT", "PAID"] },
      },
    }),
    prisma.booking.count({
      where: {
        siteId,
        startsAt: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.booking.count({ where: { siteId, status: "PENDING" } }),
    prisma.booking.count({
      where: { siteId, status: { in: ["PAID", "DEPOSIT", "CONFIRMED"] } },
    }),
    prisma.booking.count({ where: { siteId, status: "CANCELLED" } }),
    prisma.booking.count({ where: { siteId, status: "NO_SHOW" } }),
    prisma.booking.count({ where: { siteId } }),
    prisma.booking.aggregate({
      where: { siteId, status: { in: REVENUE_STATUSES } },
      _sum: { amountCents: true, depositCents: true },
    }),
    prisma.booking.aggregate({
      where: {
        siteId,
        status: { in: REVENUE_STATUSES },
        createdAt: { gte: monthStart },
      },
      _sum: { amountCents: true },
    }),
    prisma.booking.aggregate({
      where: {
        siteId,
        status: { in: REVENUE_STATUSES },
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      _sum: { amountCents: true },
    }),
    prisma.booking.aggregate({
      where: {
        siteId,
        status: { in: REVENUE_STATUSES },
        createdAt: { gte: weekAgo },
      },
      _sum: { amountCents: true },
    }),
    prisma.booking.aggregate({
      where: {
        siteId,
        status: { in: ["DEPOSIT", "PAID", "CONFIRMED", "COMPLETED"] },
        depositCents: { gt: 0 },
      },
      _sum: { depositCents: true },
    }),
    prisma.booking.findMany({
      where: {
        siteId,
        createdAt: { gte: day14Ago },
        status: { not: "CANCELLED" },
      },
      select: { createdAt: true, amountCents: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: { siteId, status: { in: REVENUE_STATUSES } },
      _count: { _all: true },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        siteId,
        startsAt: { gte: now, lte: nextWeek },
        status: { in: ["PENDING", "CONFIRMED", "DEPOSIT", "PAID"] },
      },
      include: { service: true, staff: { include: { staff: true } } },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
  ]);

  const serviceIds = topRaw.map((r) => r.serviceId);
  const services = serviceIds.length
    ? await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true },
      })
    : [];
  const serviceName = new Map(services.map((s) => [s.id, s.name]));

  const dayBuckets = Array.from({ length: 14 }, (_, i) => {
    const d = startOfDay(new Date(day14Ago.getTime() + i * 24 * 60 * 60 * 1000));
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      bookings: 0,
      revenueCents: 0,
    };
  });
  const byKey = new Map(dayBuckets.map((b) => [b.key, b]));
  for (const row of recentForChart) {
    const key = startOfDay(row.createdAt).toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (!bucket) continue;
    bucket.bookings += 1;
    if (REVENUE_STATUSES.includes(row.status)) bucket.revenueCents += row.amountCents;
  }

  const revenueMonthCents = revenueMonth._sum.amountCents ?? 0;
  const revenueLastMonthCents = revenueLastMonth._sum.amountCents ?? 0;
  const monthDeltaPct =
    revenueLastMonthCents > 0
      ? Math.round(((revenueMonthCents - revenueLastMonthCents) / revenueLastMonthCents) * 1000) / 10
      : revenueMonthCents > 0
        ? 100
        : 0;

  return {
    bookingsWeek,
    bookingsMonth,
    bookingsUpcoming,
    bookingsToday,
    pending,
    paid,
    cancelled,
    noShows,
    total,
    noShowRate: total ? Math.round((noShows / total) * 1000) / 10 : 0,
    revenueCents: revenueAll._sum.amountCents ?? 0,
    revenueMonthCents,
    revenueLastMonthCents,
    revenueWeekCents: revenueWeek._sum.amountCents ?? 0,
    monthDeltaPct,
    depositCollectedCents: deposits._sum.depositCents ?? 0,
    last14Days: dayBuckets,
    topServices: topRaw.map((r) => ({
      serviceId: r.serviceId,
      name: serviceName.get(r.serviceId) ?? "Service",
      count: r._count._all,
      revenueCents: r._sum.amountCents ?? 0,
    })),
    upcoming,
  };
}
