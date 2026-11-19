import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { entitlementsForTier } from "@/lib/plan-entitlements";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    const existing = await prisma.staff.findFirst({ where: { id, siteId: site.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (parsed.data.active === true && !existing.active) {
      const entitlements = entitlementsForTier(site.plan?.tier);
      const activeCount = await prisma.staff.count({
        where: { siteId: site.id, active: true },
      });
      if (entitlements.staffLimit != null && activeCount >= entitlements.staffLimit) {
        return NextResponse.json(
          {
            error: `Your plan allows ${entitlements.staffLimit} active team members.`,
            code: "LIMIT",
          },
          { status: 403 },
        );
      }
    }

    const data: { name?: string; email?: string | null; active?: boolean } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.email !== undefined) {
      data.email =
        parsed.data.email === "" || parsed.data.email == null
          ? null
          : parsed.data.email.trim().toLowerCase();
    }
    if (parsed.data.active !== undefined) data.active = parsed.data.active;

    const staff = await prisma.staff.update({ where: { id }, data });
    return NextResponse.json(staff);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  try {
    const site = await requireDemoSite();
    const existing = await prisma.staff.findFirst({ where: { id, siteId: site.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.staff.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
