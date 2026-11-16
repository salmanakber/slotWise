import { NextResponse } from "next/server";
import { BookingError, loadSiteBundle } from "@/lib/booking/create";
import { getTheme } from "@/lib/themes";

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  try {
    const site = await loadSiteBundle(publicKey);
    const theme = getTheme(site.branding?.themeKey ?? "amber-light");
    return NextResponse.json({
      publicKey: site.publicKey,
      name: site.name,
      timezone: site.timezone,
      currency: site.currency,
      branding: {
        ...site.branding,
        theme,
      },
      services: site.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
      })),
      staff: site.staff.map((s) => ({ id: s.id, name: s.name })),
      payment: {
        mode: site.stripeAccount?.paymentMode ?? "DEPOSIT",
        depositPercent: site.stripeAccount?.depositPercent ?? 30,
      },
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
