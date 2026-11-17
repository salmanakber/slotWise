import { prisma } from "@/lib/prisma";

/** Send booking details to a connected Zapier destination when enabled. */
export async function notifyZapierBooking(input: {
  siteId: string;
  event: "booking.created" | "booking.cancelled" | "booking.updated";
  payload: Record<string, unknown>;
}) {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId: input.siteId, provider: "zapier" } },
  });
  if (!row || row.status !== "connected" || !row.webhookUrl) return { sent: false as const };

  try {
    const res = await fetch(row.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "slotwise",
        event: input.event,
        sentAt: new Date().toISOString(),
        ...input.payload,
      }),
    });
    await prisma.siteIntegration.update({
      where: { id: row.id },
      data: { lastSyncAt: new Date(), status: res.ok ? "connected" : "error" },
    });
    if (!res.ok) {
      console.error("[zapier]", res.status, await res.text().catch(() => ""));
      return { sent: false as const };
    }
    return { sent: true as const };
  } catch (e) {
    console.error("[zapier]", e);
    return { sent: false as const };
  }
}
