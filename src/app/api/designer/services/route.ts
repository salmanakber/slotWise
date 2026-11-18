import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { paidEventRequiresStripe, siteCanCollectPayments } from "@/lib/payments-gate";
import { canUse, entitlementsForTier } from "@/lib/plan-entitlements";
import { findSiteForDesigner } from "@/lib/designer/site";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

const serviceSchema = z.object({
  webflowSiteId: z.string().optional(),
  publicKey: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  locationType: z.enum(["onsite", "online", "phone", "hybrid"]).optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  durationMin: z.number().int().min(5).max(24 * 60),
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  bufferBeforeMin: z.number().int().min(0).max(240).optional(),
  bufferAfterMin: z.number().int().min(0).max(240).optional(),
  minNoticeMin: z.number().int().min(0).max(60 * 24 * 30).optional(),
  maxPerDay: z.number().int().min(1).max(100).optional().nullable(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});

async function resolveSite(webflowSiteId?: string, publicKey?: string) {
  return findSiteForDesigner({ webflowSiteId, publicKey });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = await resolveSite(
    url.searchParams.get("webflowSiteId") || undefined,
    url.searchParams.get("publicKey") || undefined,
  );
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });

  const services = await prisma.service.findMany({
    where: { siteId: site.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(
    { services, entitlements: entitlementsForTier(site.plan?.tier) },
    { headers: cors },
  );
}

export async function POST(request: Request) {
  try {
    const body = serviceSchema.parse(await request.json());
    const site = await resolveSite(body.webflowSiteId, body.publicKey);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });

    const tier = site.plan?.tier ?? "FREE";
    const ent = entitlementsForTier(tier);
    const count = await prisma.service.count({ where: { siteId: site.id } });
    if (ent.eventsLimit != null && count >= ent.eventsLimit) {
      return NextResponse.json(
        {
          error: `Free plan allows ${ent.eventsLimit} events. Upgrade to add more.`,
          upgrade: true,
          entitlements: ent,
        },
        { status: 402, headers: cors },
      );
    }

    if (body.category && !canUse(tier, "categories")) {
      return NextResponse.json(
        { error: "Categories require Pro", upgrade: true, entitlements: ent },
        { status: 402, headers: cors },
      );
    }
    if (body.featured && !canUse(tier, "featured_events")) {
      return NextResponse.json(
        { error: "Featured events require Business", upgrade: true, entitlements: ent },
        { status: 402, headers: cors },
      );
    }
    if ((body.capacity ?? 1) > 1 && !canUse(tier, "capacity")) {
      return NextResponse.json(
        { error: "Group capacity requires Business", upgrade: true, entitlements: ent },
        { status: 402, headers: cors },
      );
    }
    if (
      body.locationType &&
      body.locationType !== "onsite" &&
      !canUse(tier, "online_location")
    ) {
      return NextResponse.json(
        { error: "Online / phone locations require Pro", upgrade: true, entitlements: ent },
        { status: 402, headers: cors },
      );
    }
    if (
      ((body.bufferBeforeMin ?? 0) > 0 || (body.bufferAfterMin ?? 15) !== 15) &&
      !canUse(tier, "buffers")
    ) {
      return NextResponse.json(
        { error: "Custom buffers require Pro", upgrade: true, entitlements: ent },
        { status: 402, headers: cors },
      );
    }

    if (paidEventRequiresStripe(body.priceCents ?? 0)) {
      const payments = await siteCanCollectPayments(site.id);
      if (!payments.canChargePaidEvents) {
        return NextResponse.json(
          {
            error: payments.message,
            code: "STRIPE_REQUIRED",
            setupUrl: payments.setupUrl,
          },
          { status: 402, headers: cors },
        );
      }
    }

    const service = await prisma.service.create({
      data: {
        siteId: site.id,
        name: body.name,
        description: body.description ?? null,
        category: canUse(tier, "categories") ? body.category ?? null : null,
        color: body.color ?? "#f5a000",
        locationType: body.locationType ?? "onsite",
        capacity: canUse(tier, "capacity") ? body.capacity ?? 1 : 1,
        durationMin: body.durationMin,
        priceCents: body.priceCents ?? 0,
        bufferBeforeMin: canUse(tier, "buffers") ? body.bufferBeforeMin ?? 0 : 0,
        bufferAfterMin: canUse(tier, "buffers") ? body.bufferAfterMin ?? 15 : 15,
        minNoticeMin: body.minNoticeMin ?? 240,
        maxPerDay: body.maxPerDay ?? null,
        active: body.active ?? true,
        featured: canUse(tier, "featured_events") ? body.featured ?? false : false,
        sortOrder: count,
      },
    });

    return NextResponse.json({ service }, { headers: cors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid payload" },
      { status: 400, headers: cors },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const json = await request.json();
    const id = z.string().min(1).parse(json.id);
    const body = serviceSchema.partial().parse(json);
    const existing = await prisma.service.findUnique({
      where: { id },
      include: { site: { include: { plan: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404, headers: cors });

    const tier = existing.site.plan?.tier ?? "FREE";
    const nextPrice = body.priceCents !== undefined ? body.priceCents : existing.priceCents;
    if (paidEventRequiresStripe(nextPrice)) {
      const payments = await siteCanCollectPayments(existing.siteId);
      if (!payments.canChargePaidEvents) {
        return NextResponse.json(
          {
            error: payments.message,
            code: "STRIPE_REQUIRED",
            setupUrl: payments.setupUrl,
          },
          { status: 402, headers: cors },
        );
      }
    }
    const service = await prisma.service.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description === undefined ? undefined : body.description,
        category: body.category === undefined ? undefined : canUse(tier, "categories") ? body.category : existing.category,
        color: body.color,
        locationType: body.locationType,
        capacity: body.capacity !== undefined && canUse(tier, "capacity") ? body.capacity : undefined,
        durationMin: body.durationMin,
        priceCents: body.priceCents,
        bufferBeforeMin: body.bufferBeforeMin !== undefined && canUse(tier, "buffers") ? body.bufferBeforeMin : undefined,
        bufferAfterMin: body.bufferAfterMin !== undefined && canUse(tier, "buffers") ? body.bufferAfterMin : undefined,
        minNoticeMin: body.minNoticeMin,
        maxPerDay: body.maxPerDay,
        active: body.active,
        featured: body.featured !== undefined && canUse(tier, "featured_events") ? body.featured : undefined,
      },
    });
    return NextResponse.json({ service }, { headers: cors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid payload" },
      { status: 400, headers: cors },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: cors });
  await prisma.service.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true }, { headers: cors });
}
