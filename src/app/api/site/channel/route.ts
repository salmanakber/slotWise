import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Site install channel only. Never clears webflowSiteId / Webflow tokens.
 * WIX = primary embed target is Wix; WEBFLOW default keeps existing behavior.
 */
const patchSchema = z.object({
  channel: z.enum(["WEBFLOW", "WIX", "DIRECT"]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    const channel =
      (site as { channel?: string }).channel === "WIX"
        ? "WIX"
        : (site as { channel?: string }).channel === "DIRECT"
          ? "DIRECT"
          : "WEBFLOW";
    return NextResponse.json({
      publicKey: site.publicKey,
      channel,
      webflowLinked: Boolean(site.webflowSiteId),
      wixSiteId: (site as { wixSiteId?: string | null }).wixSiteId ?? null,
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
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  try {
    const site = await requireDemoSite();
    // Only update channel — never touch webflowSiteId / webflowToken.
    const updated = await prisma.site.update({
      where: { id: site.id },
      data: { channel: parsed.data.channel },
      select: {
        publicKey: true,
        channel: true,
        webflowSiteId: true,
        wixSiteId: true,
      },
    });
    return NextResponse.json({
      publicKey: updated.publicKey,
      channel: updated.channel,
      webflowLinked: Boolean(updated.webflowSiteId),
      wixSiteId: updated.wixSiteId,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
