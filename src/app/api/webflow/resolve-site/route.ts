import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  webflowSiteId: z.string().min(1),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/** Designer Extension lookup — map Webflow site id → Slotwise publicKey (no login). */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { webflowSiteId } = bodySchema.parse(json);
    const site = await prisma.site.findUnique({
      where: { webflowSiteId },
      select: {
        publicKey: true,
        name: true,
        branding: { select: { businessName: true } },
      },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not connected yet" }, { status: 404, headers: cors });
    }
    return NextResponse.json(
      {
        publicKey: site.publicKey,
        name: site.branding?.businessName || site.name,
      },
      { headers: cors },
    );
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: cors });
  }
}
