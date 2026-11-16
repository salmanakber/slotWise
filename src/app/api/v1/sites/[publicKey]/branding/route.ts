import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  themeKey: z.string().min(1),
  accent: z.string().min(4).max(9),
  radius: z.number().int().min(0).max(28),
  font: z.string().min(1),
  layout: z.enum(["INLINE", "POPUP", "FLOATING"]),
  businessName: z.string().max(120).optional(),
  showStaff: z.boolean(),
  showPrice: z.boolean(),
  showDuration: z.boolean(),
  showBadge: z.boolean(),
  showLoader: z.boolean(),
  loaderStyle: z.enum(["PULSE", "SPIN", "DRAW", "CALENDAR"]),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid branding" }, { status: 400 });
  }

  try {
    const site = await prisma.site.findUnique({ where: { publicKey } });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const branding = await prisma.branding.upsert({
      where: { siteId: site.id },
      update: {
        ...parsed.data,
        businessName: parsed.data.businessName ?? site.name,
      },
      create: {
        siteId: site.id,
        ...parsed.data,
        businessName: parsed.data.businessName ?? site.name,
      },
    });

    return NextResponse.json(branding);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
