import { NextResponse } from "next/server";
import { z } from "zod";
import { findSiteForDesigner } from "@/lib/designer/site";
import { listOwnerNotifications } from "@/lib/owner-notifications";
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = await findSiteForDesigner({
    webflowSiteId: url.searchParams.get("webflowSiteId"),
    publicKey: url.searchParams.get("publicKey"),
  });
  if (!site) {
    return NextResponse.json({ error: "Site not connected" }, { status: 404, headers: cors });
  }
  const inbox = await listOwnerNotifications(site.id, 20);
  return NextResponse.json(inbox, { headers: cors });
}

const patchSchema = z.object({
  webflowSiteId: z.string().optional().nullable(),
  publicKey: z.string().optional().nullable(),
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

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
  if (parsed.data.all) {
    await prisma.ownerNotification.updateMany({
      where: { siteId: site.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (parsed.data.ids?.length) {
    await prisma.ownerNotification.updateMany({
      where: { siteId: site.id, id: { in: parsed.data.ids } },
      data: { readAt: new Date() },
    });
  }
  const inbox = await listOwnerNotifications(site.id, 20);
  return NextResponse.json(inbox, { headers: cors });
}
