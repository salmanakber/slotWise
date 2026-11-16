import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function requireDemoSite() {
  const site = await prisma.site.findUnique({
    where: { publicKey: DEMO_PUBLIC_KEY },
    include: {
      branding: true,
      stripeAccount: true,
      notificationSettings: true,
      services: { orderBy: { sortOrder: "asc" } },
      availability: { orderBy: { dayOfWeek: "asc" } },
      timeOff: { orderBy: { startsAt: "asc" } },
      staff: { orderBy: { name: "asc" } },
      plan: true,
    },
  });
  if (!site) throw new Error("Demo site missing — run npm run db:seed");
  return site;
}
