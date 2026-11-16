import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { CancelBookingButton } from "./cancel-button";

export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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

  const cancelled = booking.status === "CANCELLED";

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <div className="sw-card">
        <p className="mb-1 text-sm" style={{ color: "var(--mut)" }}>
          {booking.site.name}
        </p>
        <h1 className="m-0 text-2xl font-extrabold">
          {cancelled ? "Booking cancelled" : "Your booking"}
        </h1>
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
        </div>

        {!cancelled ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <CancelBookingButton token={token} />
            <Link href={`/book/${booking.site.publicKey}`} className="sw-btn">
              Book again
            </Link>
          </div>
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
