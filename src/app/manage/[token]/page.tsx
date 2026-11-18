import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { CancelBookingButton } from "./cancel-button";
import { MeetingPicker } from "./meeting-picker";

export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; pay?: string }>;
}) {
  const { token } = await params;
  const qs = await searchParams;
  let booking = null;
  try {
    booking = await prisma.booking.findUnique({
      where: { manageToken: token },
      include: { service: true, site: true, staff: { include: { staff: true } } },
    });
  } catch {
    notFound();
  }
  if (!booking) notFound();

  // Customer abandoned Stripe Checkout — free the slot
  if (qs.pay === "canceled" && booking.status === "PENDING") {
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
      include: { service: true, site: true, staff: { include: { staff: true } } },
    });
  }

  const cancelled = booking.status === "CANCELLED";
  const paidBanner = qs.paid === "1" || booking.status === "PAID";
  const awaitingPay = booking.status === "PENDING";

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <div className="sw-card">
        <p className="mb-1 text-sm" style={{ color: "var(--mut)" }}>
          {booking.site.name}
        </p>
        <h1 className="m-0 text-2xl font-extrabold">
          {cancelled
            ? "Booking cancelled"
            : paidBanner
              ? "You’re booked"
              : awaitingPay
                ? "Payment required"
                : "Your booking"}
        </h1>
        {paidBanner && !cancelled ? (
          <p className="mt-2 text-[13px] font-semibold" style={{ color: "var(--ok, #178a58)" }}>
            Payment received — you’re all set.
          </p>
        ) : null}
        {awaitingPay && !cancelled ? (
          <p className="mt-2 text-[13px]" style={{ color: "var(--mut)" }}>
            This booking is held until payment completes. If you closed Stripe, book again to pay.
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 text-sm">
          <Row label="Reference" value={booking.reference} />
          <Row label="Service" value={booking.service.name} />
          <Row label="When" value={new Date(booking.startsAt).toLocaleString()} />
          <Row
            label="Staff"
            value={booking.staff.map((s) => s.staff.name).join(", ") || "Any available"}
          />
          <Row label="Amount" value={formatMoney(booking.amountCents, booking.currency)} />
          <Row label="Status" value={booking.status} />
          {booking.meetingUrl ? (
            <Row
              label="Meeting"
              value={booking.meetingProvider === "zoom" ? "Zoom" : "Google Meet"}
            />
          ) : null}
        </div>

        {!cancelled ? (
          <>
            <MeetingPicker
              token={token}
              initialUrl={booking.meetingUrl}
              initialProvider={booking.meetingProvider}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {booking.meetingUrl ? (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sw-btn sw-btn-primary"
                >
                  Join meeting
                </a>
              ) : null}
              <CancelBookingButton token={token} />
              <Link href={`/book/${booking.site.publicKey}`} className="sw-btn">
                Book again
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-5">
            <Link href={`/book/${booking.site.publicKey}`} className="sw-btn sw-btn-primary">
              Rebook
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-[var(--ln)] py-2">
      <span style={{ color: "var(--mut)" }}>{label}</span>
      <b>{value}</b>
    </div>
  );
}
