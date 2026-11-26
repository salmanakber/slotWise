import { z } from "zod";
import { BookingError, createBooking } from "@/lib/booking/create";
import { publicCorsOptions, publicJson } from "@/lib/cors";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.string().min(10),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().min(3).max(200).refine((v) => v.includes("@"), "Invalid email"),
  customerPhone: z.string().max(40).optional(),
  staffId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function OPTIONS() {
  return publicCorsOptions();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return publicJson(
      { error: "Invalid booking payload", details: parsed.error.flatten() },
      { status: 400 },
    );
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

    return publicJson(
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
        checkoutUrl: booking.checkoutUrl ?? null,
        requiresPayment: Boolean(booking.requiresPayment),
        chargeCents: booking.chargeCents ?? booking.depositCents ?? 0,
        meetingUrl: booking.meetingUrl ?? null,
        meetingProvider: booking.meetingProvider ?? null,
        meetingTools: booking.meetingTools ?? [],
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof BookingError) {
      const status =
        e.code === "UNAVAILABLE"
          ? 409
          : e.code === "NOT_FOUND"
            ? 404
            : e.code === "LIMIT_REACHED"
              ? 403
              : 400;
      return publicJson({ error: e.message, code: e.code }, { status });
    }
    console.error(e);
    return publicJson({ error: "Could not create booking" }, { status: 500 });
  }
}
