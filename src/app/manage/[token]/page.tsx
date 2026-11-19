import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listMeetingTools } from "@/lib/meeting-tools";
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
      include: {
        service: true,
        site: { include: { branding: true } },
        staff: { include: { staff: true } },
      },
    });
  } catch {
    notFound();
  }
  if (!booking) notFound();

  if (qs.pay === "canceled" && booking.status === "PENDING") {
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
      include: {
        service: true,
        site: { include: { branding: true } },
        staff: { include: { staff: true } },
      },
    });
  }

  const cancelled = booking.status === "CANCELLED";
  const paidBanner = qs.paid === "1" || booking.status === "PAID";
  const awaitingPay = booking.status === "PENDING";
  const accent = booking.site.branding?.accent || "#f5a000";
  const business = booking.site.branding?.businessName || booking.site.name;
  const whenLabel = new Date(booking.startsAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const staffLabel =
    booking.staff.map((s) => s.staff.name).join(", ") || "Any available";
  const meetingTools = cancelled
    ? []
    : await listMeetingTools(booking.siteId).catch(() => []);

  const title = cancelled
    ? "Booking cancelled"
    : paidBanner
      ? "You’re booked"
      : awaitingPay
        ? "Payment required"
        : "Your booking";

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#070b12] text-[#f4f1ea]">
      <style>{`
        @keyframes sw-mg-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
        .sw-mg-rise { animation: sw-mg-rise .7s cubic-bezier(.2,.8,.2,1) both; }
        .sw-mg-rise-2 { animation: sw-mg-rise .8s .08s cubic-bezier(.2,.8,.2,1) both; }
        .sw-mg-rise-3 { animation: sw-mg-rise .85s .16s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .sw-mg-rise, .sw-mg-rise-2, .sw-mg-rise-3 { animation: none !important; }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(900px 520px at 80% 0%, color-mix(in srgb, ${accent} 32%, transparent), transparent 55%), radial-gradient(700px 420px at 10% 100%, rgba(255,255,255,.05), transparent 50%), linear-gradient(165deg, #05080e 0%, #0e1624 45%, #070b12 100%)`,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-10">
        <header className="sw-mg-rise mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={34} height={34} className="rounded-lg" />
            <div>
              <div
                className="text-[15px] font-bold tracking-tight"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Slotwise
              </div>
              <div className="text-[11px] font-semibold text-[#8b97a8]">{business}</div>
            </div>
          </div>
          <Link
            href={`/book/${booking.site.publicKey}`}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12.5px] font-bold text-[#c9d0da] backdrop-blur transition hover:border-white/30"
          >
            Book again
          </Link>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8">
          <section className="sw-mg-rise-2 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_rgba(0,0,0,.35)] sm:p-8">
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em]"
              style={{
                background: cancelled
                  ? "rgba(192,57,43,.15)"
                  : paidBanner
                    ? "color-mix(in srgb, #178a58 18%, transparent)"
                    : `color-mix(in srgb, ${accent} 18%, transparent)`,
                color: cancelled ? "#ff8f84" : paidBanner ? "#5ddea8" : accent,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: cancelled ? "#ff8f84" : paidBanner ? "#5ddea8" : accent,
                }}
              />
              {cancelled ? "Cancelled" : paidBanner ? "Confirmed" : awaitingPay ? "Awaiting payment" : "Scheduled"}
            </div>

            <h1
              className="m-0 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              {title}
            </h1>

            {paidBanner && !cancelled ? (
              <p className="mt-3 text-[14px] font-semibold text-[#5ddea8]">
                Payment received — you’re all set.
              </p>
            ) : null}
            {awaitingPay && !cancelled ? (
              <p className="mt-3 text-[14px] text-[#9aa7b8]">
                This booking is held until payment completes. If you closed Stripe, book again to pay.
              </p>
            ) : null}
            {cancelled ? (
              <p className="mt-3 text-[14px] text-[#9aa7b8]">
                This slot is free again. You can rebook anytime.
              </p>
            ) : null}

            <div className="mt-8 grid gap-3">
              <Detail label="Reference" value={booking.reference} />
              <Detail label="Service" value={booking.service.name} />
              <Detail label="When" value={whenLabel} />
              <Detail label="With" value={staffLabel} />
              <Detail
                label="Amount"
                value={formatMoney(booking.amountCents, booking.currency)}
              />
              {booking.meetingUrl ? (
                <Detail
                  label="Calendar / video"
                  value={
                    booking.meetingProvider === "zoom"
                      ? "Zoom"
                      : booking.meetingProvider === "teams"
                        ? "Microsoft Teams"
                        : booking.meetingProvider === "apple_calendar"
                          ? "Apple Calendar"
                          : booking.meetingProvider === "google_calendar"
                            ? "Google Calendar"
                            : "Google Meet"
                  }
                />
              ) : null}
            </div>

            {!cancelled ? (
              <div className="mt-8 flex flex-wrap gap-2">
                <CancelBookingButton token={token} />
              </div>
            ) : (
              <div className="mt-8">
                <Link
                  href={`/book/${booking.site.publicKey}`}
                  className="inline-flex rounded-full px-5 py-2.5 text-[13px] font-extrabold text-[#1a1203]"
                  style={{ background: accent }}
                >
                  Rebook
                </Link>
              </div>
            )}
          </section>

          <aside className="sw-mg-rise-3 flex flex-col gap-4">
            {!cancelled ? (
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 shadow-[0_24px_60px_rgba(0,0,0,.28)] sm:p-6">
                <div
                  className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ color: accent }}
                >
                  Partner apps
                </div>
                <h2
                  className="m-0 text-[1.35rem] font-extrabold tracking-tight"
                  style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
                >
                  {booking.meetingUrl
                    ? "Your calendar / video is ready"
                    : meetingTools.length
                      ? "Add calendar or video"
                      : "You’re all set"}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[#9aa7b8]">
                  {booking.meetingUrl
                    ? "Open the link below on your phone or laptop."
                    : meetingTools.length
                      ? "Optional — attach Apple Calendar, Google, Zoom, or Teams to this booking."
                      : "The host hasn’t connected partner apps yet. Your booking is still confirmed."}
                </p>

                <div className="mt-5 [&_.overflow-hidden]:!border-white/10 [&_.overflow-hidden]:!bg-transparent [&_.overflow-hidden]:!shadow-none">
                  <MeetingPicker
                    token={token}
                    initialUrl={booking.meetingUrl}
                    initialProvider={booking.meetingProvider}
                    theme={{
                      accent,
                      onAccent: "#1a1203",
                      ink: "#f4f1ea",
                      mut: "#9aa7b8",
                      line: "rgba(255,255,255,.12)",
                      panel: "rgba(255,255,255,.04)",
                      radius: 20,
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8b97a8]">
                Need help?
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#9aa7b8]">
                Keep this page — it’s your manage link for this booking. You can cancel or rebook
                without creating an account.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-white/10 py-3 first:border-t-0 first:pt-0">
      <span className="text-[13px] text-[#8b97a8]">{label}</span>
      <b className="text-right text-[14px] font-extrabold tracking-tight">{value}</b>
    </div>
  );
}
