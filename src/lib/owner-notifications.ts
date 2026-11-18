import { prisma } from "@/lib/prisma";

export async function createOwnerNotification(input: {
  siteId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  try {
    return await prisma.ownerNotification.create({
      data: {
        siteId: input.siteId,
        type: input.type,
        title: input.title.slice(0, 160),
        body: input.body.slice(0, 400),
        href: input.href || null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (e) {
    console.error("[owner-notification]", e);
    return null;
  }
}

export async function listOwnerNotifications(siteId: string, take = 40) {
  const [items, unread] = await Promise.all([
    prisma.ownerNotification.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.ownerNotification.count({
      where: { siteId, readAt: null },
    }),
  ]);
  return {
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      meta: n.meta,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}
