import { BookingsBoard } from "@/components/admin/bookings-board";
import { getOwnerSiteOrNull } from "@/lib/site-admin";
import { getSiteBookings, getSiteOverviewStats } from "@/lib/sites";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const site = await getOwnerSiteOrNull();
  const [rows, stats] = site
    ? await Promise.all([
        getSiteBookings(site.id, 500).catch(() => []),
        getSiteOverviewStats(site.id).catch(() => null),
      ])
    : [[], null];

  const serialized = rows.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    timezone: b.timezone,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    notes: b.notes,
    amountCents: b.amountCents,
    depositCents: b.depositCents,
    currency: b.currency,
    stripePaymentId: b.stripePaymentId,
    meetingUrl: b.meetingUrl ?? null,
    meetingProvider: b.meetingProvider ?? null,
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
    service: { name: b.service.name },
    location: b.location ? { name: b.location.name } : null,
    staff: b.staff.map((s) => ({ staff: { name: s.staff.name } })),
  }));

  const summary = stats
    ? {
        total: stats.total,
        upcoming: stats.bookingsUpcoming,
        pending: stats.pending,
        revenue: stats.revenueCents,
        deposits: stats.depositCollectedCents,
      }
    : null;

  return (
    <BookingsBoard
      rows={serialized}
      currency={site?.currency ?? "USD"}
      summary={summary}
    />
  );
}
