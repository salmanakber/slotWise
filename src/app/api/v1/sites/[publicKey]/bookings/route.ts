import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError, createBooking } from "@/lib/booking/create";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.string().datetime(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().min(3).max(200).refine((v) => v.includes("@"), "Invalid email"),
  customerPhone: z.string().max(40).optional(),
  staffId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const booking = await createBooking({
      publicKey,
      serviceId: parsed.data.serviceId,
      startsAtIso: parsed.data.startsAt,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      staffId: parsed.data.staffId,
      notes: parsed.data.notes,
    });

    return NextResponse.json(
      {
        id: booking.id,
        reference: booking.reference,
        manageToken: booking.manageToken,
        status: booking.status,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        amountCents: booking.amountCents,
        depositCents: booking.depositCents,
        currency: booking.currency,
        service: booking.service.name,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof BookingError) {
      const status = e.code === "UNAVAILABLE" ? 409 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}
