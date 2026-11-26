import { z } from "zod";
import { BookingError, listSlotsForService } from "@/lib/booking/create";
import { publicCorsOptions, publicJson } from "@/lib/cors";

const querySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().optional(),
});

export async function OPTIONS() {
  return publicCorsOptions();
}

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
    return publicJson({ error: "serviceId and date (YYYY-MM-DD) required" }, { status: 400 });
  }

  try {
    const data = await listSlotsForService({
      publicKey,
      serviceId: parsed.data.serviceId,
      dateIso: parsed.data.date,
      staffId: parsed.data.staffId,
    });
    return publicJson(data);
  } catch (e) {
    if (e instanceof BookingError) {
      return publicJson(
        { error: e.message, code: e.code },
        { status: e.code === "NOT_FOUND" ? 404 : 400 },
      );
    }
    return publicJson({ error: "Database unavailable" }, { status: 503 });
  }
}
