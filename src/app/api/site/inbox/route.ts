import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { listOwnerNotifications } from "@/lib/owner-notifications";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    const inbox = await listOwnerNotifications(site.id, 50);
    return NextResponse.json(inbox);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const site = await requireDemoSite();
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
    const inbox = await listOwnerNotifications(site.id, 50);
    return NextResponse.json(inbox);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}
