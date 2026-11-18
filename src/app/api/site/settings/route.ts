import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";
import { isSupportedCurrency } from "@/lib/currencies";

const bodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  timezone: z.string().min(1).max(80).optional(),
  locale: z.string().min(2).max(20).optional(),
  currency: z.string().min(3).max(3).optional(),
  businessName: z.string().max(120).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    return NextResponse.json({
      name: site.name,
      timezone: site.timezone,
      locale: site.locale,
      currency: site.currency,
      businessName: site.branding?.businessName ?? site.name,
      publicKey: site.publicKey,
    });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    if (parsed.data.currency) {
      const code = parsed.data.currency.toUpperCase();
      if (!isSupportedCurrency(code)) {
        return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
      }
    }
    const updated = await prisma.site.update({
      where: { id: site.id },
      data: {
        name: parsed.data.name,
        timezone: parsed.data.timezone,
        locale: parsed.data.locale,
        currency: parsed.data.currency?.toUpperCase(),
      },
    });
    if (parsed.data.businessName !== undefined) {
      await prisma.branding.upsert({
        where: { siteId: site.id },
        update: { businessName: parsed.data.businessName },
        create: { siteId: site.id, businessName: parsed.data.businessName },
      });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
