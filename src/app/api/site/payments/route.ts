import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  paymentMode: z.enum(["FULL", "DEPOSIT", "PAY_ON_SITE"]).optional(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  cancelFreeHours: z.number().int().min(0).max(720).optional(),
  noShowFeePercent: z.number().int().min(0).max(100).optional(),
  saveCardForNoShow: z.boolean().optional(),
  taxMode: z.string().max(40).optional(),
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
    const account = await prisma.stripeAccount.upsert({
      where: { siteId: site.id },
      update: parsed.data,
      create: { siteId: site.id, ...parsed.data },
    });
    return NextResponse.json({ ...account, currency: site.currency });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
