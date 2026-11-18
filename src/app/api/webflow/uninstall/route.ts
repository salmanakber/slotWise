import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, isPlatformRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireDemoSite } from "@/lib/site-admin";
import { uninstallSlotwiseFromWebflowSite } from "@/lib/webflow-uninstall";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  webflowSiteId: z.string().optional().nullable(),
  publicKey: z.string().optional().nullable(),
  siteId: z.string().optional().nullable(),
});

/**
 * Clean uninstall: strip App custom code (while token works), deactivate site,
 * delete Webflow token. Call this BEFORE or when disconnecting from Webflow.
 * After marketplace uninstall, token is often already revoked — we still deactivate
 * so leftover canvas iframes stop loading a live widget.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid uninstall request" }, { status: 400 });
  }

  let site =
    (parsed.data.siteId
      ? await prisma.site.findUnique({ where: { id: parsed.data.siteId } })
      : null) ||
    (parsed.data.webflowSiteId
      ? await prisma.site.findUnique({ where: { webflowSiteId: parsed.data.webflowSiteId } })
      : null) ||
    (parsed.data.publicKey
      ? await prisma.site.findUnique({ where: { publicKey: parsed.data.publicKey } })
      : null);

  if (!site && session?.user) {
    try {
      site = await requireDemoSite();
    } catch {
      site = null;
    }
  }

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Allow signed-in owners / platform, or Designer CORS with matching webflowSiteId
  const isOwner =
    Boolean(session?.user) &&
    (isPlatformRole(session?.user?.role) ||
      (await prisma.membership.findFirst({
        where: {
          userId: session!.user!.id,
          workspaceId: site.workspaceId,
        },
      })));

  const designerHint = Boolean(parsed.data.webflowSiteId || parsed.data.publicKey);
  if (!isOwner && !designerHint) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await uninstallSlotwiseFromWebflowSite({
    siteId: site.id,
    reason: "manual_uninstall",
  });

  return NextResponse.json(
    {
      ...result,
      message:
        "Slotwise disconnected. Publish your Webflow site so removed custom code goes live. Delete any leftover booking blocks on the canvas if they remain.",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
