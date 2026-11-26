import { BookingError, loadSiteBundle } from "@/lib/booking/create";
import { publicCorsOptions, publicJson } from "@/lib/cors";
import { canUse } from "@/lib/plan-entitlements";
import { prisma } from "@/lib/prisma";
import { getTheme } from "@/lib/themes";
import { validateWebflowConnection } from "@/lib/webflow-uninstall";

export async function OPTIONS() {
  return publicCorsOptions();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  try {
    // If Webflow app was uninstalled, deactivate so leftover mounts stop working
    const row = await prisma.site.findUnique({
      where: { publicKey },
      select: { id: true, webflowSiteId: true, status: true },
    });
    if (row?.webflowSiteId && row.status === "ACTIVE") {
      await validateWebflowConnection(row.id, { force: true }).catch(() => undefined);
    }

    const site = await loadSiteBundle(publicKey);
    const theme = getTheme(site.branding?.themeKey ?? "amber-light");
    const inkColor = site.branding?.inkColor || theme.ink;
    return publicJson({
      publicKey: site.publicKey,
      name: site.name,
      timezone: site.timezone,
      currency: site.currency,
      calendarChatEnabled: Boolean(
        site.calendarChatEnabled && canUse(site.plan?.tier, "ai_calendar_chat"),
      ),
      branding: {
        ...site.branding,
        inkColor,
        theme: { ...theme, ink: inkColor },
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
        mode: site.stripeAccount?.paymentMode ?? "FULL",
        depositPercent: site.stripeAccount?.depositPercent ?? 30,
        chargesEnabled: Boolean(
          site.stripeAccount?.stripeAccountId && site.stripeAccount?.chargesEnabled,
        ),
      },
    });
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
