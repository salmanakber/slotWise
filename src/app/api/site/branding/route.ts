import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";
import { getTheme } from "@/lib/themes";
import { resolveSiteTheme } from "@/lib/site-theme";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  themeKey: z.string().min(1).optional(),
  accent: z.string().min(4).max(9).optional(),
  inkColor: z.string().min(4).max(9).optional().nullable(),
  radius: z.number().int().min(0).max(28).optional(),
  font: z.string().min(1).optional(),
  layout: z.enum(["INLINE", "POPUP", "FLOATING"]).optional(),
  businessName: z.string().max(120).optional(),
  showStaff: z.boolean().optional(),
  showPrice: z.boolean().optional(),
  showDuration: z.boolean().optional(),
  showBadge: z.boolean().optional(),
  showLoader: z.boolean().optional(),
  loaderStyle: z.enum(["PULSE", "SPIN", "DRAW", "CALENDAR"]).optional(),
  ga4MeasurementId: z
    .string()
    .max(32)
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null) return v;
      const t = v.trim().toUpperCase();
      if (!t) return null;
      return t;
    })
    .refine((v) => v == null || /^G-[A-Z0-9]+$/.test(v), {
      message: "GA4 ID must look like G-XXXXXXXX",
    }),
  metaPixelId: z
    .string()
    .max(32)
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null) return v;
      const t = v.trim().replace(/\s+/g, "");
      if (!t) return null;
      return t;
    })
    .refine((v) => v == null || /^\d{5,20}$/.test(v), {
      message: "Meta Pixel ID must be numbers only",
    }),
});

function payloadFromSite(site: Awaited<ReturnType<typeof requireDemoSite>>) {
  const branding = site.branding;
  const tokens = resolveSiteTheme({
    themeKey: branding?.themeKey,
    accent: branding?.accent,
    inkColor: branding?.inkColor,
    font: branding?.font,
    radius: branding?.radius,
  });
  const theme = getTheme(tokens.themeKey);
  return {
    publicKey: site.publicKey,
    currency: site.currency,
    ...tokens,
    layout: branding?.layout ?? "INLINE",
    businessName: branding?.businessName || site.name,
    showStaff: branding?.showStaff ?? true,
    showPrice: branding?.showPrice ?? true,
    showDuration: branding?.showDuration ?? true,
    showBadge: branding?.showBadge ?? true,
    showLoader: branding?.showLoader ?? true,
    loaderStyle: branding?.loaderStyle ?? "PULSE",
    ga4MeasurementId: branding?.ga4MeasurementId ?? null,
    metaPixelId: branding?.metaPixelId ?? null,
    theme,
  };
}

/** Branding + theme tokens for the owner workspace chrome. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    return NextResponse.json(payloadFromSite(site));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}

/** Save branding from dashboard — same DB row Designer Extension updates. */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid branding" }, { status: 400 });
  }

  try {
    const site = await requireDemoSite();
    const body = parsed.data;
    const theme = body.themeKey ? getTheme(body.themeKey) : null;

    const updateData: Record<string, unknown> = {
      ...(body.themeKey !== undefined ? { themeKey: body.themeKey } : {}),
      ...(body.accent !== undefined
        ? { accent: body.accent }
        : theme
          ? { accent: theme.accent }
          : {}),
      ...(body.inkColor !== undefined
        ? { inkColor: body.inkColor }
        : theme
          ? { inkColor: theme.ink }
          : {}),
      ...(body.radius !== undefined
        ? { radius: body.radius }
        : theme
          ? { radius: theme.radius }
          : {}),
      ...(body.font !== undefined
        ? { font: body.font }
        : theme
          ? { font: theme.font }
          : {}),
      ...(body.layout !== undefined ? { layout: body.layout } : {}),
      ...(body.businessName !== undefined ? { businessName: body.businessName } : {}),
      ...(body.showStaff !== undefined ? { showStaff: body.showStaff } : {}),
      ...(body.showPrice !== undefined ? { showPrice: body.showPrice } : {}),
      ...(body.showDuration !== undefined ? { showDuration: body.showDuration } : {}),
      ...(body.showBadge !== undefined ? { showBadge: body.showBadge } : {}),
      ...(body.showLoader !== undefined ? { showLoader: body.showLoader } : {}),
      ...(body.loaderStyle !== undefined ? { loaderStyle: body.loaderStyle } : {}),
      ...(body.ga4MeasurementId !== undefined
        ? { ga4MeasurementId: body.ga4MeasurementId }
        : {}),
      ...(body.metaPixelId !== undefined ? { metaPixelId: body.metaPixelId } : {}),
      ...(theme ? { buttonStyle: theme.button } : {}),
    };

    await prisma.branding.upsert({
      where: { siteId: site.id },
      update: updateData,
      create: {
        siteId: site.id,
        themeKey: body.themeKey ?? theme?.key ?? "amber-light",
        accent: body.accent ?? theme?.accent ?? "#f5a000",
        inkColor: body.inkColor ?? theme?.ink ?? "#0f1b2d",
        radius: body.radius ?? theme?.radius ?? 14,
        font: body.font ?? theme?.font ?? "Manrope",
        buttonStyle: theme?.button ?? "solid",
        layout: body.layout ?? "INLINE",
        businessName: body.businessName ?? site.name,
        showStaff: body.showStaff ?? true,
        showPrice: body.showPrice ?? true,
        showDuration: body.showDuration ?? true,
        showBadge: body.showBadge ?? true,
        showLoader: body.showLoader ?? true,
        loaderStyle: body.loaderStyle ?? "PULSE",
        ga4MeasurementId: body.ga4MeasurementId ?? null,
        metaPixelId: body.metaPixelId ?? null,
      },
    });

    const refreshed = await requireDemoSite();
    return NextResponse.json(payloadFromSite(refreshed));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
