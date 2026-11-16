import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Inbound Zapier/Make webhook — validates token stored on SiteIntegration. */
export async function POST(
  request: Request,
  context: { params: Promise<{ publicKey: string; token: string }> },
) {
  const { publicKey, token } = await context.params;
  const site = await prisma.site.findUnique({ where: { publicKey } });
  if (!site) return NextResponse.json({ error: "Unknown site" }, { status: 404 });

  const integration = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId: site.id, provider: "zapier" } },
  });
  if (!integration?.webhookUrl?.includes(token)) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  await prisma.auditLog.create({
    data: {
      scope: "SITE",
      action: "zapier.webhook.received",
      siteId: site.id,
      meta: { body },
    },
  });

  await prisma.siteIntegration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date(), status: "connected" },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicKey: string; token: string }> },
) {
  const { publicKey, token } = await context.params;
  return NextResponse.json({
    ok: true,
    message: "Zapier webhook ready",
    publicKey,
    tokenHint: token.slice(0, 6) + "…",
  });
}
