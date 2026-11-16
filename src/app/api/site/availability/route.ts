import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

const daySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const bodySchema = z.object({
  days: z.array(daySchema).min(7).max(7),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    return NextResponse.json({
      timezone: site.timezone,
      days: site.availability.filter((a) => a.staffId == null),
      timeOff: site.timeOff,
    });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid hours" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    await prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({ where: { siteId: site.id, staffId: null } });
      await tx.weeklyAvailability.createMany({
        data: parsed.data.days.map((d) => ({
          siteId: site.id,
          dayOfWeek: d.dayOfWeek,
          enabled: d.enabled,
          startTime: d.startTime,
          endTime: d.endTime,
        })),
      });
    });
    const days = await prisma.weeklyAvailability.findMany({
      where: { siteId: site.id, staffId: null },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json({ days });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
