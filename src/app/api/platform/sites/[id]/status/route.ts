import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const site = await prisma.site.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    await prisma.auditLog.create({
      data: {
        scope: "PLATFORM",
        action: `site.status.${parsed.data.status.toLowerCase()}`,
        siteId: site.id,
        meta: { publicKey: site.publicKey, name: site.name },
      },
    });

    return NextResponse.json({ id: site.id, status: site.status });
  } catch {
    return NextResponse.json({ error: "Site not found or database unavailable" }, { status: 404 });
  }
}
