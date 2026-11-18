import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REVENUE = ["PAID", "DEPOSIT", "CONFIRMED", "COMPLETED"] as const;

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

export async function GET() {
  if (!(await requireUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    const services = await prisma.service.findMany({
      where: { siteId: site.id },
      orderBy: { sortOrder: "asc" },
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const withStats = await Promise.all(
      services.map(async (s) => {
        const [bookingsAll, bookingsMonth, revenueAll, revenueMonth, upcoming] = await Promise.all([
          prisma.booking.count({
            where: { siteId: site.id, serviceId: s.id, status: { not: "CANCELLED" } },
          }),
          prisma.booking.count({
            where: {
              siteId: site.id,
              serviceId: s.id,
              createdAt: { gte: monthStart },
              status: { not: "CANCELLED" },
            },
          }),
          prisma.booking.aggregate({
            where: { siteId: site.id, serviceId: s.id, status: { in: [...REVENUE] } },
            _sum: { amountCents: true, depositCents: true },
          }),
          prisma.booking.aggregate({
            where: {
              siteId: site.id,
              serviceId: s.id,
              status: { in: [...REVENUE] },
              createdAt: { gte: monthStart },
            },
            _sum: { amountCents: true },
          }),
          prisma.booking.count({
            where: {
              siteId: site.id,
              serviceId: s.id,
              startsAt: { gte: now },
              status: { in: ["PENDING", "CONFIRMED", "DEPOSIT", "PAID"] },
            },
          }),
        ]);
        return {
          ...s,
          stats: {
            bookingsAll,
            bookingsMonth,
            upcoming,
            revenueCents: revenueAll._sum.amountCents ?? 0,
            depositCents: revenueAll._sum.depositCents ?? 0,
            revenueMonthCents: revenueMonth._sum.amountCents ?? 0,
          },
        };
      }),
    );

    return NextResponse.json({
      currency: site.currency,
      services: withStats,
    });
  } catch {
    return NextResponse.json({ error: "Site unavailable" }, { status: 503 });
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  durationMin: z.number().int().min(5).max(24 * 60),
  priceCents: z.number().int().min(0),
  bufferAfterMin: z.number().int().min(0).max(240).optional(),
  minNoticeMin: z.number().int().min(0).max(10080).optional(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!(await requireUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid service" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    const service = await prisma.service.create({
      data: {
        siteId: site.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        durationMin: parsed.data.durationMin,
        priceCents: parsed.data.priceCents,
        bufferAfterMin: parsed.data.bufferAfterMin ?? 15,
        minNoticeMin: parsed.data.minNoticeMin ?? 240,
        active: parsed.data.active ?? true,
        sortOrder: site.services.length,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create service" }, { status: 500 });
  }
}
