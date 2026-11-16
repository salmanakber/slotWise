import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto";
import { canUse, entitlementsForTier } from "@/lib/plan-entitlements";
import { findSiteForDesigner } from "@/lib/designer/site";
import { prisma } from "@/lib/prisma";

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
    if (!canUse(tier, "publish")) {
      return NextResponse.json(
        { error: "Publish requires an active plan", upgrade: true, entitlements: entitlementsForTier(tier) },
        { status: 402, headers: cors },
      );
    }

    if (!site.webflowSiteId) {
      return NextResponse.json(
        { error: "No Webflow site linked", hint: "Use Designer notify + publish manually" },
        { status: 400, headers: cors },
      );
    }

    const tokenRow = await prisma.webflowToken.findUnique({ where: { siteId: site.id } });
    if (!tokenRow) {
      return NextResponse.json(
        { error: "Reconnect Webflow to publish from Slotwise", reconnect: true },
        { status: 401, headers: cors },
      );
    }

    const access = decryptSecret(tokenRow.accessTokenEncrypted);
    const res = await fetch(`https://api.webflow.com/v2/sites/${site.webflowSiteId}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ publishToWebflowSubdomain: true }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Webflow publish failed", detail: text },
        { status: 502, headers: cors },
      );
    }

    const data = await res.json();
    await prisma.auditLog.create({
      data: { scope: "SITE", action: "webflow.published", siteId: site.id, meta: data },
    });

    return NextResponse.json({ ok: true, data }, { headers: cors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 400, headers: cors },
    );
  }
}
