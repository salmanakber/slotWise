import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(200).optional().nullable(),
  /** If true, block the entire calendar day. */
  allDay: z.boolean().optional(),
});

function rangeInSiteTz(opts: {
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  allDay?: boolean;
}) {
  const startLocal = opts.allDay ? "00:00" : opts.startTime;
  const endLocal = opts.allDay ? "23:59" : opts.endTime;
  const startsAt = fromZonedTime(`${opts.date}T${startLocal}:00`, opts.timezone);
  const endsAt = fromZonedTime(`${opts.date}T${endLocal}:00`, opts.timezone);
  if (!(startsAt < endsAt)) throw new Error("End time must be after start time");
  return { startsAt, endsAt };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    const timeOff = await prisma.timeOff.findMany({
      where: { siteId: site.id, endsAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { startsAt: "asc" },
      take: 80,
    });
    return NextResponse.json({
      timezone: site.timezone,
      timeOff: timeOff.map((t) => ({
        id: t.id,
        startsAt: t.startsAt.toISOString(),
        endsAt: t.endsAt.toISOString(),
        reason: t.reason,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid blocked range" }, { status: 400 });
  }

  try {
    const site = await requireDemoSite();
    const { startsAt, endsAt } = rangeInSiteTz({
      ...parsed.data,
      timezone: site.timezone,
    });
    const row = await prisma.timeOff.create({
      data: {
        siteId: site.id,
        startsAt,
        endsAt,
        reason: parsed.data.reason?.trim() || "Blocked slots",
      },
    });
    return NextResponse.json({
      timeOff: {
        id: row.id,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        reason: row.reason,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not block range" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    await prisma.timeOff.deleteMany({ where: { id, siteId: site.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
