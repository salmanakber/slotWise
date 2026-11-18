import { NextResponse } from "next/server";
import { z } from "zod";
import { findSiteForDesigner } from "@/lib/designer/site";
import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

const daySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const hoursSchema = z.object({
  webflowSiteId: z.string().optional().nullable(),
  publicKey: z.string().optional().nullable(),
  days: z.array(daySchema).min(7).max(7),
});

const blockSchema = z.object({
  webflowSiteId: z.string().optional().nullable(),
  publicKey: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(200).optional().nullable(),
  allDay: z.boolean().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = await findSiteForDesigner({
    webflowSiteId: url.searchParams.get("webflowSiteId"),
    publicKey: url.searchParams.get("publicKey"),
  });
  if (!site) {
    return NextResponse.json({ error: "Site not connected" }, { status: 404, headers: cors });
  }

  const [days, timeOff] = await Promise.all([
    prisma.weeklyAvailability.findMany({
      where: { siteId: site.id, staffId: null },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.timeOff.findMany({
      where: { siteId: site.id, endsAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { startsAt: "asc" },
      take: 40,
    }),
  ]);

  return NextResponse.json(
    {
      timezone: site.timezone,
      days,
      timeOff: timeOff.map((t) => ({
        id: t.id,
        startsAt: t.startsAt.toISOString(),
        endsAt: t.endsAt.toISOString(),
        reason: t.reason,
      })),
    },
    { headers: cors },
  );
}

export async function PUT(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = hoursSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid hours" }, { status: 400, headers: cors });
  }
  const site = await findSiteForDesigner({
    webflowSiteId: parsed.data.webflowSiteId,
    publicKey: parsed.data.publicKey,
  });
  if (!site) {
    return NextResponse.json({ error: "Site not connected" }, { status: 404, headers: cors });
  }

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
  return NextResponse.json({ days, timezone: site.timezone }, { headers: cors });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = blockSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid block" }, { status: 400, headers: cors });
  }
  const site = await findSiteForDesigner({
    webflowSiteId: parsed.data.webflowSiteId,
    publicKey: parsed.data.publicKey,
  });
  if (!site) {
    return NextResponse.json({ error: "Site not connected" }, { status: 404, headers: cors });
  }

  const startLocal = parsed.data.allDay ? "00:00" : parsed.data.startTime;
  const endLocal = parsed.data.allDay ? "23:59" : parsed.data.endTime;
  const startsAt = fromZonedTime(`${parsed.data.date}T${startLocal}:00`, site.timezone);
  const endsAt = fromZonedTime(`${parsed.data.date}T${endLocal}:00`, site.timezone);
  if (!(startsAt < endsAt)) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400, headers: cors });
  }

  const row = await prisma.timeOff.create({
    data: {
      siteId: site.id,
      startsAt,
      endsAt,
      reason: parsed.data.reason?.trim() || "Blocked slots",
    },
  });

  return NextResponse.json(
    {
      timeOff: {
        id: row.id,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        reason: row.reason,
      },
    },
    { headers: cors },
  );
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const site = await findSiteForDesigner({
    webflowSiteId: url.searchParams.get("webflowSiteId"),
    publicKey: url.searchParams.get("publicKey"),
  });
  if (!site) {
    return NextResponse.json({ error: "Site not connected" }, { status: 404, headers: cors });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400, headers: cors });
  }
  await prisma.timeOff.deleteMany({ where: { id, siteId: site.id } });
  return NextResponse.json({ ok: true }, { headers: cors });
}
