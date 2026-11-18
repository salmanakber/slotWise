import { formatInTimeZone } from "date-fns-tz";
import { Role } from "@prisma/client";
import { sendBookingConfirmation, sendOwnerBookingAlert } from "@/lib/email";
import { syncBookingIntegrations } from "@/lib/integrations-sync";
import { createOwnerNotification } from "@/lib/owner-notifications";
import { canUse } from "@/lib/plan-entitlements";
import { prisma } from "@/lib/prisma";
import { sendSms, sendWhatsApp } from "@/lib/sms";

/** After Stripe marks a booking PAID — sync calendars + send confirmations. */
export async function notifyBookingPaid(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      site: {
        include: {
          branding: true,
          notificationSettings: true,
          plan: true,
          workspace: {
            include: {
              memberships: {
                where: { role: Role.WORKSPACE_OWNER },
                take: 1,
                include: { user: { select: { email: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!booking) return;

  const site = booking.site;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const manageUrl = `${appUrl}/manage/${booking.manageToken}`;
  const whenLabel = formatInTimeZone(
    booking.startsAt,
    booking.timezone || site.timezone,
    "EEE, MMM d · h:mm a",
  );
  const businessName = site.branding?.businessName || site.name;
  const ownerEmail =
    site.notificationSettings?.replyToEmail ||
    site.workspace?.memberships?.[0]?.user?.email ||
    null;

  // Push to Google Calendar / Outlook now that payment succeeded
  await syncBookingIntegrations({
    siteId: site.id,
    reference: booking.reference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    serviceName: booking.service.name,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    timezone: booking.timezone || site.timezone,
    manageUrl,
    locationType: booking.service.locationType,
  }).catch((err) => console.error("[paid:calendar-sync]", err));

  if (site.notificationSettings?.emailConfirm !== false) {
    await sendBookingConfirmation({
      to: booking.customerEmail,
      reference: booking.reference,
      serviceName: booking.service.name,
      whenLabel,
      manageUrl,
      businessName,
      fromEmail: site.notificationSettings?.fromEmail || null,
      replyToEmail: ownerEmail,
      customerName: booking.customerName,
      meetingUrl: booking.meetingUrl,
      meetingProvider: booking.meetingProvider,
    }).catch((err) => console.error("paid confirmation email failed", err));
  }

  if (ownerEmail && site.notificationSettings?.ownerEmailAlert !== false) {
    const amountLabel =
      booking.amountCents > 0
        ? new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: (booking.currency || "USD").toUpperCase(),
          }).format(booking.amountCents / 100)
        : null;
    await sendOwnerBookingAlert({
      to: ownerEmail,
      reference: booking.reference,
      serviceName: booking.service.name,
      whenLabel,
      dashboardUrl: `${appUrl}/dashboard/bookings`,
      businessName,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      amountLabel: amountLabel ? `${amountLabel} · paid` : "Paid",
      fromEmail: site.notificationSettings?.fromEmail || null,
      meetingUrl: booking.meetingUrl,
      meetingProvider: booking.meetingProvider,
    }).catch((err) => console.error("owner paid alert failed", err));
  }

  await createOwnerNotification({
    siteId: site.id,
    type: "payment",
    title: `Payment received · ${booking.reference}`,
    body: `${booking.customerName} paid for ${booking.service.name} · ${whenLabel}.`,
    href: "/dashboard/bookings",
    meta: { bookingId: booking.id, reference: booking.reference },
  });

  const smsBody = [
    `${businessName}: payment received for ${booking.reference} · ${whenLabel}.`,
    `Manage: ${manageUrl}`,
  ].join(" ");

  if (
    booking.customerPhone &&
    site.notificationSettings?.smsEnabled &&
    canUse(site.plan?.tier, "sms")
  ) {
    await sendSms({ to: booking.customerPhone, body: smsBody }).catch(() => undefined);
  }
  if (
    booking.customerPhone &&
    site.notificationSettings?.whatsappEnabled &&
    canUse(site.plan?.tier, "sms")
  ) {
    await sendWhatsApp({ to: booking.customerPhone, body: smsBody }).catch(() => undefined);
  }
}
