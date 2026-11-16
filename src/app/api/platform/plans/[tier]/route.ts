import { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  priceMonthly: z.number().int().min(0).optional(),
  priceYearly: z.number().int().min(0).optional(),
  bookingsLimit: z.number().int().min(0).nullable().optional(),
  staffLimit: z.number().int().min(0).nullable().optional(),
  sitesLimit: z.number().int().min(0).nullable().optional(),
  themesLimit: z.number().int().min(1).max(8).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tier: string }> },
) {
  const { tier: raw } = await context.params;
  const tier = raw.toUpperCase() as PlanTier;
  if (!Object.values(PlanTier).includes(tier)) {
    return NextResponse.json({ error: "Unknown plan tier" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const plan = await prisma.plan.update({
      where: { tier },
      data: parsed.data,
    });
    await prisma.auditLog.create({
      data: {
        scope: "PLATFORM",
        action: "plan.updated",
        meta: { tier, ...parsed.data },
      },
    });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Plan not found or DB unavailable" }, { status: 404 });
  }
}
