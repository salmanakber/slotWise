import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  try {
    const booking = await prisma.booking.findUnique({ where: { manageToken: token } });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ ok: true, status: "CANCELLED" });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        scope: "SITE",
        action: "booking.cancelled",
        siteId: booking.siteId,
        meta: { reference: booking.reference, via: "manage_link" },
      },
    });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch {
    return NextResponse.json({ error: "Could not cancel" }, { status: 500 });
  }
}
