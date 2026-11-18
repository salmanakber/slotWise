import { BookingStatus, Prisma, Role } from "@prisma/client";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getDaySlots, rankSlots } from "@/lib/booking/availability";
import { sendBookingConfirmation, sendOwnerBookingAlert } from "@/lib/email";
import { syncBookingIntegrations } from "@/lib/integrations-sync";
import { canUse, entitlementsForTier } from "@/lib/plan-entitlements";
import { notifyZapierBooking } from "@/lib/zapier";
import { getPlatformSecrets } from "@/lib/platform-config";
import { prisma } from "@/lib/prisma";
import { sendSms, sendWhatsApp } from "@/lib/sms";
import { listMeetingTools } from "@/lib/meeting-tools";
import { createOwnerNotification } from "@/lib/owner-notifications";
import { createBookingCheckoutSession } from "@/lib/stripe";
import { appOrigin } from "@/lib/webflow";

function refCode() {
  return `#${Math.floor(1000 + Math.random() * 9000)}`;
}

export class BookingError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "UNAVAILABLE" | "INACTIVE" | "VALIDATION" | "LIMIT_REACHED",
  ) {
    super(message);
  }
}

export async function loadSiteBundle(publicKey: string) {
  const [site, platform] = await Promise.all([
    prisma.site.findUnique({
      where: { publicKey },
      include: {
        branding: true,
        notificationSettings: true,
        services: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        staff: { where: { active: true }, orderBy: { name: "asc" } },
        availability: true,
        timeOff: true,
        stripeAccount: true,
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
    }),
    getPlatformSecrets(),
  ]);
  if (!site) throw new BookingError("Site not found", "NOT_FOUND");
  if (platform.maintenanceMode) {
    throw new BookingError("Bookings are temporarily paused for maintenance", "INACTIVE");
  }
  if (site.status !== "ACTIVE") throw new BookingError("Site is not accepting bookings", "INACTIVE");
  return site;
}

export async function listSlotsForService(input: {
  publicKey: string;
  serviceId: string;
  dateIso: string; // YYYY-MM-DD
  staffId?: string;
}) {
  const site = await loadSiteBundle(input.publicKey);
  const service = site.services.find((s) => s.id === input.serviceId);
  if (!service) throw new BookingError("Service not found", "NOT_FOUND");

  const day = new Date(`${input.dateIso}T12:00:00.000Z`);
  const dayStart = new Date(`${input.dateIso}T00:00:00.000Z`);
  const dayEnd = addMinutes(dayStart, 36 * 60);

  const bookings = await prisma.booking.findMany({
    where: {
      siteId: site.id,
      status: { notIn: [BookingStatus.CANCELLED] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
      ...(input.staffId
        ? { staff: { some: { staffId: input.staffId } } }
        : {}),
    },
    select: { startsAt: true, endsAt: true },
  });

  const weekly = site.availability
    .filter((a) => (input.staffId ? a.staffId === input.staffId : a.staffId == null))
    .map((a) => ({
      dayOfWeek: a.dayOfWeek,
      enabled: a.enabled,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

  // Fall back to site-wide hours if no staff-specific rules
  const rules =
    weekly.length > 0
      ? weekly
      : site.availability
          .filter((a) => a.staffId == null)
          .map((a) => ({
            dayOfWeek: a.dayOfWeek,
            enabled: a.enabled,
            startTime: a.startTime,
            endTime: a.endTime,
          }));

  const slots = rankSlots(
    getDaySlots({
      date: day,
      timezone: site.timezone,
      durationMin: service.durationMin,
      bufferBeforeMin: service.bufferBeforeMin,
      bufferAfterMin: service.bufferAfterMin,
      minNoticeMin: service.minNoticeMin,
      weekly: rules,
      bookings,
      timeOff: site.timeOff.map((t) => ({ startsAt: t.startsAt, endsAt: t.endsAt })),
    }),
  );

  return {
    site: {
      publicKey: site.publicKey,
      name: site.name,
      timezone: site.timezone,
      currency: site.currency,
      branding: site.branding,
    },
    service,
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      label: s.label,
      available: s.available,
      reason: s.reason,
    })),
  };
}

export async function createBooking(input: {
  publicKey: string;
  serviceId: string;
  startsAtIso: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  staffId?: string;
  notes?: string;
  intakeAnswers?: Prisma.InputJsonValue;
}) {
  const site = await loadSiteBundle(input.publicKey);
  const service = site.services.find((s) => s.id === input.serviceId);
  if (!service) throw new BookingError("Service not found", "NOT_FOUND");

  const entitlements = entitlementsForTier(site.plan?.tier);
  if (entitlements.bookingsLimit != null) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const used = await prisma.booking.count({
      where: {
        siteId: site.id,
        createdAt: { gte: monthStart },
        status: { not: BookingStatus.CANCELLED },
      },
    });
    if (used >= entitlements.bookingsLimit) {
      throw new BookingError(
        `This site reached its ${entitlements.bookingsLimit} bookings/month plan limit. Upgrade to accept more bookings.`,
        "LIMIT_REACHED",
      );
    }
  }

  const startsAt = new Date(input.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    throw new BookingError("Invalid start time", "VALIDATION");
  }
  const endsAt = addMinutes(startsAt, service.durationMin);
  const dateIso = formatInTimeZone(startsAt, site.timezone, "yyyy-MM-dd");

  const availability = await listSlotsForService({
    publicKey: input.publicKey,
    serviceId: input.serviceId,
    dateIso,
    staffId: input.staffId,
  });

  const match = availability.slots.find(
    (s) => s.available && Math.abs(new Date(s.start).getTime() - startsAt.getTime()) < 1000,
  );
  if (!match) {
    throw new BookingError("That slot is no longer available", "UNAVAILABLE");
  }

  const depositPercent = site.stripeAccount?.depositPercent ?? 30;
  const paymentMode = site.stripeAccount?.paymentMode ?? "FULL";
  const amountCents = service.priceCents;
  /** Amount to collect online via Stripe Checkout (0 = book without card). */
  const chargeCents =
    amountCents <= 0 || paymentMode === "PAY_ON_SITE"
      ? 0
      : paymentMode === "FULL"
        ? amountCents
        : Math.max(1, Math.round((amountCents * depositPercent) / 100));
  const depositCents = chargeCents;
  let connectedId = site.stripeAccount?.stripeAccountId || null;
  let chargesEnabled = Boolean(site.stripeAccount?.chargesEnabled);
  const needsOnlinePayment = chargeCents > 0;

  // Live-refresh Connect readiness — stale chargesEnabled=false blocked Checkout forever
  if (needsOnlinePayment && connectedId && !chargesEnabled) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = await getStripe();
      if (stripe) {
        const remote = await stripe.accounts.retrieve(connectedId);
        chargesEnabled = Boolean(remote.charges_enabled);
        await prisma.stripeAccount.updateMany({
          where: { stripeAccountId: connectedId },
          data: {
            chargesEnabled,
            payoutsEnabled: Boolean(remote.payouts_enabled),
          },
        });
      }
    } catch (e) {
      console.error("[booking:stripe-refresh]", e);
    }
  }

  if (needsOnlinePayment && (!connectedId || !chargesEnabled)) {
    throw new BookingError(
      !connectedId
        ? "Online payment isn’t set up yet. The business needs to connect Stripe under Payments."
        : "Stripe Connect isn’t finished — charges aren’t enabled yet. Open Payments and complete onboarding.",
      "INACTIVE",
    );
  }

  // Serializable-ish guard: create only if no overlapping active booking exists
  const booking = await prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        siteId: site.id,
        status: { notIn: [BookingStatus.CANCELLED] },
        startsAt: { lt: addMinutes(endsAt, service.bufferAfterMin) },
        endsAt: { gt: addMinutes(startsAt, -service.bufferBeforeMin) },
        ...(input.staffId ? { staff: { some: { staffId: input.staffId } } } : {}),
      },
      select: { id: true },
    });
    if (conflict) throw new BookingError("That slot is no longer available", "UNAVAILABLE");

    const created = await tx.booking.create({
      data: {
        reference: refCode(),
        siteId: site.id,
        serviceId: service.id,
        // Paid online → PENDING until Stripe confirms; deposit label after payment webhook → PAID
        status: needsOnlinePayment
          ? BookingStatus.PENDING
          : BookingStatus.CONFIRMED,
        startsAt,
        endsAt,
        timezone: site.timezone,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim().toLowerCase(),
        customerPhone: input.customerPhone?.trim() || null,
        notes: input.notes?.trim() || null,
        intakeAnswers: input.intakeAnswers ?? undefined,
        amountCents,
        depositCents,
        currency: site.currency,
        staff: input.staffId
          ? { create: [{ staffId: input.staffId }] }
          : undefined,
      },
      include: { service: true, staff: { include: { staff: true } } },
    });

    await tx.auditLog.create({
      data: {
        scope: "SITE",
        action: "booking.created",
        siteId: site.id,
        meta: {
          reference: created.reference,
          serviceId: service.id,
          startsAt: startsAt.toISOString(),
        },
      },
    });

    return created;
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ownerEmail =
    site.notificationSettings?.replyToEmail ||
    site.workspace?.memberships?.[0]?.user?.email ||
    null;
  const manageUrl = `${appUrl}/manage/${booking.manageToken}`;
  const whenLabel = formatInTimeZone(
    booking.startsAt,
    site.timezone,
    "EEE, MMM d · h:mm a",
  );
  const businessName = site.branding?.businessName || site.name;
  const origin = appOrigin();

  // Paid events: create Checkout and return the URL immediately.
  // Do NOT await calendar sync / email / Zapier first — that blocked the client on a
  // skeleton forever while Google/email hung, so Stripe never opened.
  let checkoutUrl: string | null = null;
  if (needsOnlinePayment && connectedId) {
    try {
      const session = await Promise.race([
        createBookingCheckoutSession({
          amountCents: chargeCents,
          currency: booking.currency || site.currency || "USD",
          connectedAccountId: connectedId,
          bookingId: booking.id,
          bookingReference: booking.reference,
          serviceName: booking.service.name,
          customerEmail: booking.customerEmail,
          successUrl: `${origin}/manage/${booking.manageToken}?paid=1`,
          cancelUrl: `${origin}/manage/${booking.manageToken}?pay=canceled`,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Stripe Checkout timed out — check platform Stripe keys and Connect account")),
            18_000,
          ),
        ),
      ]);
      checkoutUrl = session.url;
    } catch (err) {
      console.error("booking checkout session failed", err);
      await prisma.booking
        .update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED },
        })
        .catch(() => undefined);
      const detail =
        err instanceof Error && err.message
          ? err.message.slice(0, 180)
          : "Could not start Stripe payment";
      throw new BookingError(
        `Could not start Stripe payment: ${detail}`,
        "VALIDATION",
      );
    }
    if (!checkoutUrl) {
      await prisma.booking
        .update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED },
        })
        .catch(() => undefined);
      throw new BookingError(
        "Could not start Stripe payment. Please try again in a moment.",
        "VALIDATION",
      );
    }

    // Background only — response must not wait on these
    void (async () => {
      try {
        await createOwnerNotification({
          siteId: site.id,
          type: "payment",
          title: `Awaiting payment · ${booking.reference}`,
          body: `${booking.customerName} started checkout for ${booking.service.name} · ${whenLabel}.`,
          href: "/dashboard/bookings",
          meta: {
            bookingId: booking.id,
            reference: booking.reference,
            customerEmail: booking.customerEmail,
            chargeCents,
          },
        });
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
            amountLabel: `${amountLabel || ""} · awaiting payment`,
            fromEmail: site.notificationSettings?.fromEmail || null,
          });
        }
        await notifyZapierBooking({
          siteId: site.id,
          event: "booking.created",
          payload: {
            reference: booking.reference,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            serviceName: booking.service.name,
            startsAt: booking.startsAt.toISOString(),
            endsAt: booking.endsAt.toISOString(),
            amountCents: booking.amountCents,
            currency: booking.currency,
            manageUrl,
            meetingUrl: null,
            siteName: businessName,
            awaitingPayment: true,
          },
        });
      } catch (e) {
        console.error("[booking:paid:side-effects]", e);
      }
    })();

    return {
      ...booking,
      checkoutUrl,
      meetingTools: [] as Awaited<ReturnType<typeof listMeetingTools>>,
      chargeCents,
      requiresPayment: true,
    };
  }

  const sync = await syncBookingIntegrations({
    siteId: site.id,
    reference: booking.reference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    serviceName: booking.service.name,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    timezone: site.timezone,
    manageUrl,
    locationType: booking.service.locationType,
  }).catch((err) => {
    console.error("integrations sync failed", err);
    return { providers: [] as string[], meetingUrl: null as string | null };
  });

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
      meetingUrl: sync.meetingUrl || booking.meetingUrl || null,
      meetingProvider: booking.meetingProvider || null,
    }).catch((err) => console.error("confirmation email failed", err));
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
      amountLabel,
      fromEmail: site.notificationSettings?.fromEmail || null,
      meetingUrl: sync.meetingUrl || booking.meetingUrl || null,
      meetingProvider: booking.meetingProvider || null,
    }).catch((err) => console.error("owner booking alert email failed", err));
  }

  await createOwnerNotification({
    siteId: site.id,
    type: "booking.created",
    title: `New booking · ${booking.reference}`,
    body: `${booking.customerName} booked ${booking.service.name} for ${whenLabel}.`,
    href: "/dashboard/bookings",
    meta: {
      bookingId: booking.id,
      reference: booking.reference,
      customerEmail: booking.customerEmail,
      chargeCents,
    },
  });

  const smsBody = [
    `${businessName}: booking ${booking.reference} confirmed for ${whenLabel}.`,
    sync.meetingUrl ? `Join: ${sync.meetingUrl}` : null,
    `Manage: ${manageUrl}`,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    booking.customerPhone &&
    site.notificationSettings?.smsEnabled &&
    canUse(site.plan?.tier, "sms")
  ) {
    await sendSms({ to: booking.customerPhone, body: smsBody }).catch((err) =>
      console.error("sms failed", err),
    );
  }

  if (
    booking.customerPhone &&
    site.notificationSettings?.whatsappEnabled &&
    canUse(site.plan?.tier, "sms")
  ) {
    await sendWhatsApp({ to: booking.customerPhone, body: smsBody }).catch((err) =>
      console.error("whatsapp failed", err),
    );
  }

  await notifyZapierBooking({
    siteId: site.id,
    event: "booking.created",
    payload: {
      reference: booking.reference,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      serviceName: booking.service.name,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      amountCents: booking.amountCents,
      currency: booking.currency,
      manageUrl,
      meetingUrl: sync.meetingUrl,
      siteName: businessName,
      awaitingPayment: false,
    },
  }).catch((err) => console.error("zapier notify failed", err));

  const meetingTools = await listMeetingTools(site.id).catch(() => []);

  return {
    ...booking,
    checkoutUrl: null,
    meetingTools,
    chargeCents,
    requiresPayment: false,
  };
}
