import { BookingsBoard } from "@/components/admin/bookings-board";
import { getDemoSite, getSiteBookings } from "@/lib/sites";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const site = await getDemoSite();
  const rows = site ? await getSiteBookings(site.id).catch(() => []) : [];

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
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
    service: { name: b.service.name },
    location: b.location ? { name: b.location.name } : null,
    staff: b.staff.map((s) => ({ staff: { name: s.staff.name } })),
  }));

  return <BookingsBoard rows={serialized} currency={site?.currency ?? "USD"} />;
}
