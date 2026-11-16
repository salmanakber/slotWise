import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const flag = await prisma.featureFlag.update({
      where: { key },
      data: { enabled: parsed.data.enabled },
    });

    await prisma.auditLog.create({
      data: {
        scope: "PLATFORM",
        action: `flag.${parsed.data.enabled ? "enabled" : "disabled"}`,
        meta: { key: flag.key },
      },
    });

    return NextResponse.json(flag);
  } catch {
    return NextResponse.json({ error: "Flag not found or database unavailable" }, { status: 404 });
  }
}
