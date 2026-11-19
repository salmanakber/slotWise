import { NextResponse } from "next/server";
import { z } from "zod";
import { createMeetingLink, listMeetingTools } from "@/lib/meeting-tools";
import { createOwnerNotification } from "@/lib/owner-notifications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.enum(["zoom", "meet", "google_calendar", "teams"]),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const booking = await prisma.booking.findUnique({
    where: { manageToken: token },
    select: {
      id: true,
      status: true,
      meetingUrl: true,
      meetingProvider: true,
      siteId: true,
    },
  });
  if (!booking || booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  const tools = await listMeetingTools(booking.siteId);
  return NextResponse.json({
    meetingUrl: booking.meetingUrl,
    meetingProvider: booking.meetingProvider,
    tools: booking.meetingUrl ? [] : tools,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Pick a partner app (Zoom, Meet, Teams, or Google Calendar)" },
      { status: 400 },
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { manageToken: token },
    include: { service: true, site: true },
  });
  if (!booking || booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.meetingUrl) {
    return NextResponse.json({
      meetingUrl: booking.meetingUrl,
      meetingProvider: booking.meetingProvider,
      alreadySet: true,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const created = await createMeetingLink({
      siteId: booking.siteId,
      provider: parsed.data.provider,
      reference: booking.reference,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      serviceName: booking.service.name,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      timezone: booking.timezone || booking.site.timezone,
      manageUrl: `${appUrl}/manage/${booking.manageToken}`,
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        meetingUrl: created.meetingUrl,
        meetingProvider: created.provider,
      },
      select: { meetingUrl: true, meetingProvider: true, reference: true },
    });

    const providerLabel =
      created.provider === "zoom"
        ? "Zoom"
        : created.provider === "teams"
          ? "Microsoft Teams"
          : created.provider === "google_calendar"
            ? "Google Calendar"
            : "Google Meet";
    await createOwnerNotification({
      siteId: booking.siteId,
      type: "meeting",
      title: `${providerLabel} added`,
      body: `${booking.customerName} added ${providerLabel} to ${booking.reference}.`,
      href: "/dashboard/bookings",
      meta: {
        bookingId: booking.id,
        meetingProvider: created.provider,
        meetingUrl: created.meetingUrl,
      },
    });

    return NextResponse.json({
      meetingUrl: updated.meetingUrl,
      meetingProvider: updated.meetingProvider,
      alreadySet: false,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create meeting" },
      { status: 502 },
    );
  }
}
