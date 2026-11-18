import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";
import { isSupportedCurrency } from "@/lib/currencies";

const bodySchema = z.object({
  paymentMode: z.enum(["FULL", "DEPOSIT", "PAY_ON_SITE"]).optional(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  cancelFreeHours: z.number().int().min(0).max(720).optional(),
  noShowFeePercent: z.number().int().min(0).max(100).optional(),
  saveCardForNoShow: z.boolean().optional(),
  taxMode: z.string().max(40).optional(),
  currency: z.string().min(3).max(3).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    if (!site.stripeAccount) {
      const created = await prisma.stripeAccount.create({ data: { siteId: site.id } });
      return NextResponse.json({ ...created, currency: site.currency });
    }
    return NextResponse.json({ ...site.stripeAccount, currency: site.currency });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    const { currency, ...accountFields } = parsed.data;

    if (currency) {
      const code = currency.toUpperCase();
      if (!isSupportedCurrency(code)) {
        return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
      }
      await prisma.site.update({
        where: { id: site.id },
        data: { currency: code },
      });
    }

    const account = await prisma.stripeAccount.upsert({
      where: { siteId: site.id },
      update: accountFields,
      create: { siteId: site.id, ...accountFields },
    });
    const updated = await prisma.site.findUnique({
      where: { id: site.id },
      select: { currency: true },
    });
    return NextResponse.json({ ...account, currency: updated?.currency ?? site.currency });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
