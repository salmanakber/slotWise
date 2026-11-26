import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findSiteForDesigner } from "@/lib/designer/site";
import { getTheme } from "@/lib/themes";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

const patchSchema = z.object({
  webflowSiteId: z.string().optional().nullable(),
  publicKey: z.string().optional().nullable(),
  themeKey: z.string().min(1).optional(),
  accent: z.string().min(4).max(9).optional(),
  inkColor: z.string().min(4).max(9).optional().nullable(),
  radius: z.number().int().min(0).max(28).optional(),
  font: z.string().min(1).optional(),
  layout: z.enum(["INLINE", "POPUP"]).optional(),
  calendarStyle: z.enum(["MONTH", "WEEK", "HORIZONTAL"]).optional(),
  stripWidthPx: z.number().int().min(320).max(750).optional(),
  popupButtonText: z.string().min(1).max(48).optional(),
});

type BrandingRow = {
  themeKey?: string | null;
  accent?: string | null;
  inkColor?: string | null;
  radius?: number | null;
  font?: string | null;
  layout?: string | null;
  calendarStyle?: string | null;
  stripWidthPx?: number | null;
  popupButtonText?: string | null;
  businessName?: string | null;
};

function normalizeStripWidthPx(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 450;
  if (n > 0 && n <= 100) {
    return Math.round(320 + ((n - 50) / 50) * 430);
  }
  return Math.min(750, Math.max(320, Math.round(n)));
}

function readInk(branding: BrandingRow | null | undefined, fallback: string) {
  return branding?.inkColor ?? fallback;
}

function brandingPayload(site: NonNullable<Awaited<ReturnType<typeof findSiteForDesigner>>>) {
  const branding = site.branding as BrandingRow | null;
  const theme = getTheme(branding?.themeKey ?? "amber-light");
  return {
    themeKey: branding?.themeKey ?? theme.key,
    accent: branding?.accent ?? theme.accent,
    inkColor: readInk(branding, theme.ink),
    radius: branding?.radius ?? theme.radius,
    font: branding?.font ?? theme.font,
    layout:
      branding?.layout === "POPUP" || branding?.layout === "FLOATING" ? "POPUP" : "INLINE",
    calendarStyle:
      branding?.calendarStyle === "WEEK"
        ? "WEEK"
        : branding?.calendarStyle === "HORIZONTAL"
          ? "HORIZONTAL"
          : "MONTH",
    stripWidthPx: normalizeStripWidthPx(branding?.stripWidthPx),
    popupButtonText: (branding?.popupButtonText || "").trim() || "Book now",
    businessName: branding?.businessName ?? site.name,
    theme,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = await findSiteForDesigner({
    webflowSiteId: url.searchParams.get("webflowSiteId"),
    publicKey: url.searchParams.get("publicKey"),
  });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });
  }
  return NextResponse.json({ branding: brandingPayload(site) }, { headers: cors });
}

export async function PATCH(request: Request) {
  try {
    const body = patchSchema.parse(await request.json());
    const site = await findSiteForDesigner({
      webflowSiteId: body.webflowSiteId,
      publicKey: body.publicKey,
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });
    }

    const theme = body.themeKey ? getTheme(body.themeKey) : null;
    const data = {
      themeKey: body.themeKey ?? undefined,
      accent: body.accent ?? theme?.accent,
      inkColor: body.inkColor === undefined ? undefined : body.inkColor,
      radius: body.radius ?? theme?.radius,
      font: body.font ?? theme?.font,
      layout: body.layout,
      calendarStyle: body.calendarStyle,
      stripWidthPx:
        body.stripWidthPx !== undefined ? normalizeStripWidthPx(body.stripWidthPx) : undefined,
      popupButtonText:
        body.popupButtonText !== undefined
          ? body.popupButtonText.trim() || "Book now"
          : undefined,
      buttonStyle: theme?.button,
    };

    const updateData: Record<string, unknown> = {
      ...(data.themeKey !== undefined ? { themeKey: data.themeKey } : {}),
      ...(data.accent !== undefined ? { accent: data.accent } : {}),
      ...(data.inkColor !== undefined ? { inkColor: data.inkColor } : {}),
      ...(data.radius !== undefined ? { radius: data.radius } : {}),
      ...(data.font !== undefined ? { font: data.font } : {}),
      ...(data.layout !== undefined ? { layout: data.layout } : {}),
      ...(data.calendarStyle !== undefined ? { calendarStyle: data.calendarStyle } : {}),
      ...(data.stripWidthPx !== undefined ? { stripWidthPx: data.stripWidthPx } : {}),
      ...(data.popupButtonText !== undefined ? { popupButtonText: data.popupButtonText } : {}),
      ...(data.buttonStyle !== undefined ? { buttonStyle: data.buttonStyle } : {}),
    };

    const branding = await prisma.branding.upsert({
      where: { siteId: site.id },
      update: updateData as Parameters<typeof prisma.branding.upsert>[0]["update"],
      create: {
        siteId: site.id,
        themeKey: data.themeKey ?? theme?.key ?? "amber-light",
        accent: data.accent ?? theme?.accent ?? "#f5a000",
        radius: data.radius ?? theme?.radius ?? 14,
        font: data.font ?? theme?.font ?? "Match my site",
        buttonStyle: data.buttonStyle ?? theme?.button ?? "solid",
        layout: data.layout ?? "INLINE",
        calendarStyle: data.calendarStyle ?? "MONTH",
        stripWidthPx: data.stripWidthPx ?? 450,
        popupButtonText: data.popupButtonText ?? "Book now",
        businessName: site.name,
        ...(data.inkColor !== undefined
          ? { inkColor: data.inkColor }
          : theme?.ink
            ? { inkColor: theme.ink }
            : {}),
      } as Parameters<typeof prisma.branding.upsert>[0]["create"],
    });

    const refreshed = await findSiteForDesigner({
      webflowSiteId: site.webflowSiteId,
      publicKey: site.publicKey,
    });

    return NextResponse.json(
      {
        branding: refreshed ? brandingPayload(refreshed) : branding,
      },
      { headers: cors },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid payload" },
      { status: 400, headers: cors },
    );
  }
}
