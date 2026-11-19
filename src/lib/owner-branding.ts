import { getServerSession } from "next-auth";
import { authOptions, isPlatformRole } from "@/lib/auth";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight branding fetch for dashboard layout first paint.
 * Avoids getDemoSite() (100 bookings + nested includes) on every sidebar navigation.
 */
export async function getOwnerBrandingLite() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const select = {
    branding: {
      select: {
        themeKey: true,
        accent: true,
        inkColor: true,
        font: true,
        radius: true,
      },
    },
  } as const;

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
        select,
      });
      if (owned?.branding) return owned.branding;
    }
  }

  if (userId && isPlatformRole(role)) {
    const linked = await prisma.site.findFirst({
      where: { webflowSiteId: { not: null } },
      orderBy: [{ lastSeenAt: "desc" }, { updatedAt: "desc" }],
      select,
    });
    if (linked?.branding) return linked.branding;
  }

  const demo = await prisma.site.findUnique({
    where: { publicKey: DEMO_PUBLIC_KEY },
    select,
  });
  return demo?.branding ?? null;
}
