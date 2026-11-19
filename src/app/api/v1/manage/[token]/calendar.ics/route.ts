import { NextResponse } from "next/server";
import { buildBookingIcs } from "@/lib/apple-caldav";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Downloadable ICS for Apple Calendar / any calendar app. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const booking = await prisma.booking.findUnique({
    where: { manageToken: token },
    include: { service: true, site: true },
  });
  if (!booking || booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const ics = buildBookingIcs({
    uid: `${booking.reference.replace(/\W/g, "")}@slotwise`,
    summary: `${booking.service.name} · ${booking.site.name}`,
    description: `Booking ${booking.reference}\\nManage: ${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/manage/${booking.manageToken}`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="slotwise-${booking.reference.replace(/\W/g, "")}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
