import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError, listSlotsForService } from "@/lib/booking/create";

const querySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    serviceId: url.searchParams.get("serviceId") ?? "",
    date: url.searchParams.get("date") ?? "",
    staffId: url.searchParams.get("staffId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "serviceId and date (YYYY-MM-DD) required" }, { status: 400 });
  }

  try {
    const data = await listSlotsForService({
      publicKey,
      serviceId: parsed.data.serviceId,
      dateIso: parsed.data.date,
      staffId: parsed.data.staffId,
    });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
