import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto";
import { findSiteForDesigner } from "@/lib/designer/site";
import { prisma } from "@/lib/prisma";
import { ensureWidgetCustomCode } from "@/lib/webflow";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const bodySchema = z.object({
  webflowSiteId: z.string().optional().nullable(),
  publicKey: z.string().optional().nullable(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * Ensure hosted widget.js is registered + applied on the Webflow site (Custom Code API).
 * Called when placing the booking embed from Designer — no manual paste required.
 */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.parse(await request.json());
    const site = await findSiteForDesigner({
      webflowSiteId: parsed.webflowSiteId,
      publicKey: parsed.publicKey,
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });
    }
    if (!site.webflowSiteId) {
      return NextResponse.json({ error: "No Webflow site linked" }, { status: 400, headers: cors });
    }

    const tokenRow = await prisma.webflowToken.findUnique({ where: { siteId: site.id } });
    if (!tokenRow?.accessTokenEncrypted) {
      return NextResponse.json({ error: "Webflow token missing — reconnect the app" }, { status: 401, headers: cors });
    }

    const accessToken = decryptSecret(tokenRow.accessTokenEncrypted);
    const applied = await ensureWidgetCustomCode(accessToken, site.webflowSiteId);

    await prisma.site.update({
      where: { id: site.id },
      data: { customCodeApplied: true },
    });

    return NextResponse.json(
      {
        ok: true,
        applied,
        note: "Publish the Webflow site so widget.js appears on the live page.",
      },
      { headers: cors },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Runtime apply failed" },
      { status: 400, headers: cors },
    );
  }
}
