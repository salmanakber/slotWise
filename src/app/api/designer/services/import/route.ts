import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canUse, entitlementsForTier } from "@/lib/plan-entitlements";
import { findSiteForDesigner } from "@/lib/designer/site";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

const rowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  durationMin: z.number().int().min(5).max(24 * 60).default(30),
  priceCents: z.number().int().min(0).default(0),
  locationType: z.enum(["onsite", "online", "phone", "hybrid"]).optional(),
  capacity: z.number().int().min(1).optional(),
  bufferBeforeMin: z.number().int().min(0).optional(),
  bufferAfterMin: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});

const bodySchema = z.object({
  webflowSiteId: z.string().optional(),
  publicKey: z.string().optional(),
  services: z.array(rowSchema).min(1).max(200),
  mode: z.enum(["merge", "replace"]).default("merge"),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const site = await findSiteForDesigner({
      webflowSiteId: body.webflowSiteId,
      publicKey: body.publicKey,
    });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });

    const tier = site.plan?.tier ?? "FREE";
    const ent = entitlementsForTier(tier);
    if (!canUse(tier, "import_export")) {
      return NextResponse.json(
        { error: "Import / export requires Pro", upgrade: true, entitlements: ent },
        { status: 402, headers: cors },
      );
    }

    if (body.mode === "replace") {
      await prisma.service.deleteMany({ where: { siteId: site.id } });
    }

    const existingCount = await prisma.service.count({ where: { siteId: site.id } });
    let created = 0;
    for (const [i, row] of body.services.entries()) {
      if (ent.eventsLimit != null && existingCount + created >= ent.eventsLimit) break;
      await prisma.service.create({
        data: {
          siteId: site.id,
          name: row.name,
          description: row.description ?? null,
          category: canUse(tier, "categories") ? row.category ?? null : null,
          durationMin: row.durationMin,
          priceCents: row.priceCents,
          locationType: row.locationType ?? "onsite",
          capacity: canUse(tier, "capacity") ? row.capacity ?? 1 : 1,
          bufferBeforeMin: canUse(tier, "buffers") ? row.bufferBeforeMin ?? 0 : 0,
          bufferAfterMin: canUse(tier, "buffers") ? row.bufferAfterMin ?? 15 : 15,
          active: row.active ?? true,
          featured: canUse(tier, "featured_events") ? row.featured ?? false : false,
          sortOrder: existingCount + i,
        },
      });
      created += 1;
    }

    return NextResponse.json({ created, entitlements: ent }, { headers: cors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 400, headers: cors },
    );
  }
}
