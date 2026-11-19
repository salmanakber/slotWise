import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { entitlementsForTier } from "@/lib/plan-entitlements";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().nullable().optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    const [staff, entitlements] = await Promise.all([
      prisma.staff.findMany({
        where: { siteId: site.id },
        orderBy: [{ active: "desc" }, { name: "asc" }],
      }),
      Promise.resolve(entitlementsForTier(site.plan?.tier)),
    ]);
    return NextResponse.json({
      staff,
      staffLimit: entitlements.staffLimit,
      staffAllowed: entitlements.gates.staff.allowed,
      upgradeLabel: entitlements.gates.staff.upgradeLabel,
      upgradeUrl: entitlements.upgradeUrl,
      showStaff: site.branding?.showStaff !== false,
    });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid staff" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    const entitlements = entitlementsForTier(site.plan?.tier);
    if (!entitlements.gates.staff.allowed) {
      return NextResponse.json(
        {
          error: `Team members are on ${entitlements.gates.staff.upgradeLabel}+. Upgrade to add staff to Who.`,
          code: "PLAN",
          upgradeUrl: entitlements.upgradeUrl,
        },
        { status: 403 },
      );
    }

    const activeCount = await prisma.staff.count({
      where: { siteId: site.id, active: true },
    });
    const willBeActive = parsed.data.active !== false;
    if (
      willBeActive &&
      entitlements.staffLimit != null &&
      activeCount >= entitlements.staffLimit
    ) {
      return NextResponse.json(
        {
          error: `Your plan allows ${entitlements.staffLimit} active team member${entitlements.staffLimit === 1 ? "" : "s"}. Upgrade or deactivate someone first.`,
          code: "LIMIT",
          upgradeUrl: entitlements.upgradeUrl,
        },
        { status: 403 },
      );
    }

    const email =
      parsed.data.email === "" || parsed.data.email == null
        ? null
        : parsed.data.email.trim().toLowerCase();

    const staff = await prisma.staff.create({
      data: {
        siteId: site.id,
        name: parsed.data.name.trim(),
        email,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json(staff, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create staff" }, { status: 500 });
  }
}
