import { NextResponse } from "next/server";
import { z } from "zod";
import { generateEventDescription } from "@/lib/ai-description";
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

const schema = z.object({
  webflowSiteId: z.string().optional(),
  publicKey: z.string().optional(),
  title: z.string().min(1),
  category: z.string().optional().nullable(),
  durationMin: z.number().int().optional(),
  locationType: z.string().optional(),
  tone: z.enum(["professional", "friendly", "premium", "concise"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const site = await findSiteForDesigner({
      webflowSiteId: body.webflowSiteId,
      publicKey: body.publicKey,
    });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });

    const tier = site.plan?.tier ?? "FREE";
    const ent = entitlementsForTier(tier);
    if (!canUse(tier, "ai_descriptions")) {
      return NextResponse.json(
        {
          error: "AI descriptions are a Pro feature",
          upgrade: true,
          entitlements: ent,
        },
        { status: 402, headers: cors },
      );
    }

    const result = await generateEventDescription(body);
    return NextResponse.json(result, { headers: cors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400, headers: cors },
    );
  }
}
