import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getCalendarChatAnalytics } from "@/lib/ai-calendar-chat";
import { authOptions } from "@/lib/auth";
import { canUse, entitlementsForTier } from "@/lib/plan-entitlements";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean(),
});

function planMeta(site: Awaited<ReturnType<typeof requireDemoSite>>) {
  const entitlements = entitlementsForTier(site.plan?.tier);
  const allowed = canUse(site.plan?.tier, "ai_calendar_chat");
  return {
    allowed,
    planTier: entitlements.tier,
    planLabel: entitlements.label,
    upgradeUrl: entitlements.upgradeUrl,
    upgradeLabel: entitlements.gates.ai_calendar_chat.upgradeLabel,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    const analytics = await getCalendarChatAnalytics(site.id);
    return NextResponse.json({
      enabled: site.calendarChatEnabled,
      publicKey: site.publicKey,
      analytics,
      ...planMeta(site),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const site = await requireDemoSite();
    if (!canUse(site.plan?.tier, "ai_calendar_chat")) {
      return NextResponse.json(
        {
          error: "AI Calendar Chat is available on Business and Agency plans",
          ...planMeta(site),
        },
        { status: 403 },
      );
    }

    const updated = await prisma.site.update({
      where: { id: site.id },
      data: { calendarChatEnabled: parsed.data.enabled },
      select: { calendarChatEnabled: true, publicKey: true },
    });
    const analytics = await getCalendarChatAnalytics(site.id);
    return NextResponse.json({
      enabled: updated.calendarChatEnabled,
      publicKey: updated.publicKey,
      analytics,
      ...planMeta(site),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}
