import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions, isPlatformRole } from "@/lib/auth";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const siteInclude = {
  branding: true,
  stripeAccount: true,
  notificationSettings: true,
  services: { orderBy: { sortOrder: "asc" as const } },
  availability: { orderBy: { dayOfWeek: "asc" as const } },
  timeOff: { orderBy: { startsAt: "asc" as const } },
  staff: { orderBy: { name: "asc" as const } },
  plan: true,
} as const;

/**
 * Resolve the workspace site for the signed-in owner.
 * Prefer Webflow-linked / most recently updated sites in their memberships —
 * NOT a hard-coded demo key (that left Designer on FREE while Dashboard upgraded Studio Nine).
 */
export async function requireDemoSite() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (userId && !isPlatformRole(role)) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);
    if (workspaceIds.length) {
      const owned = await prisma.site.findFirst({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: [{ lastSeenAt: "desc" }, { updatedAt: "desc" }],
        include: siteInclude,
      });
      if (owned) return owned;
    }
  }

  // Platform operators: prefer the most recently active Webflow-linked site
  if (userId && isPlatformRole(role)) {
    const linked = await prisma.site.findFirst({
      where: { webflowSiteId: { not: null } },
      orderBy: [{ lastSeenAt: "desc" }, { updatedAt: "desc" }],
      include: siteInclude,
    });
    if (linked) return linked;
  }

  // Any signed-in user with a single obvious site in DB
  const recent = await prisma.site.findFirst({
    orderBy: [{ lastSeenAt: "desc" }, { updatedAt: "desc" }],
    include: siteInclude,
  });
  if (recent) return recent;

  const demo = await prisma.site.findUnique({
    where: { publicKey: DEMO_PUBLIC_KEY },
    include: siteInclude,
  });
  if (!demo) throw new Error("No site available — run npm run db:seed or install via Webflow");
  return demo;
}

export async function getOwnerSiteOrNull() {
  try {
    return await requireDemoSite();
  } catch {
    return null;
  }
}

export { DEMO_PUBLIC_KEY, Role };
