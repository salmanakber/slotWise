import { NextResponse } from "next/server";
import { z } from "zod";
import { getCalendarChatAnalytics } from "@/lib/ai-calendar-chat";
import { findSiteForDesigner } from "@/lib/designer/site";
import { canUse, entitlementsForTier } from "@/lib/plan-entitlements";
import { prisma } from "@/lib/prisma";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

const patchSchema = z.object({
  webflowSiteId: z.string().optional().nullable(),
  publicKey: z.string().optional().nullable(),
  enabled: z.boolean(),
});

function planMeta(tier: string | null | undefined) {
  const entitlements = entitlementsForTier(tier);
  return {
    allowed: canUse(tier, "ai_calendar_chat"),
    planTier: entitlements.tier,
    planLabel: entitlements.label,
    upgradeUrl: entitlements.upgradeUrl,
    upgradeLabel: entitlements.gates.ai_calendar_chat.upgradeLabel,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = await findSiteForDesigner({
    webflowSiteId: url.searchParams.get("webflowSiteId"),
    publicKey: url.searchParams.get("publicKey"),
  });
  if (!site) {
    return NextResponse.json({ error: "Site not connected" }, { status: 404, headers: cors });
  }

  const analytics = await getCalendarChatAnalytics(site.id);
  return NextResponse.json(
    {
      enabled: site.calendarChatEnabled,
      publicKey: site.publicKey,
      analytics,
      ...planMeta(site.plan?.tier),
    },
    { headers: cors },
  );
}

export async function PATCH(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400, headers: cors });
  }

  const site = await findSiteForDesigner({
    webflowSiteId: parsed.data.webflowSiteId,
    publicKey: parsed.data.publicKey,
  });
  if (!site) {
    return NextResponse.json({ error: "Site not connected" }, { status: 404, headers: cors });
  }

  if (!canUse(site.plan?.tier, "ai_calendar_chat")) {
    return NextResponse.json(
      {
        error: "AI Calendar Chat requires Business or Agency",
        ...planMeta(site.plan?.tier),
      },
      { status: 403, headers: cors },
    );
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: { calendarChatEnabled: parsed.data.enabled },
    select: { calendarChatEnabled: true, publicKey: true },
  });
  const analytics = await getCalendarChatAnalytics(site.id);

  return NextResponse.json(
    {
      enabled: updated.calendarChatEnabled,
      publicKey: updated.publicKey,
      analytics,
      ...planMeta(site.plan?.tier),
    },
    { headers: cors },
  );
}
