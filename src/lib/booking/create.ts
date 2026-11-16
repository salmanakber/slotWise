import { BookingStatus, Prisma } from "@prisma/client";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getDaySlots, rankSlots } from "@/lib/booking/availability";
import { sendBookingConfirmation } from "@/lib/email";
import { getPlatformSecrets } from "@/lib/platform-config";
import { prisma } from "@/lib/prisma";

function refCode() {
  return `#${Math.floor(1000 + Math.random() * 9000)}`;
}

export class BookingError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "UNAVAILABLE" | "INACTIVE" | "VALIDATION",
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
        services: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        staff: { where: { active: true }, orderBy: { name: "asc" } },
        availability: true,
        timeOff: true,
        stripeAccount: true,
        plan: true,
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
  const paymentMode = site.stripeAccount?.paymentMode ?? "DEPOSIT";
  const amountCents = service.priceCents;
  const depositCents =
    paymentMode === "FULL"
      ? amountCents
      : paymentMode === "PAY_ON_SITE"
        ? 0
        : Math.round((amountCents * depositPercent) / 100);

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
        status: depositCents > 0 ? BookingStatus.DEPOSIT : BookingStatus.CONFIRMED,
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
  await sendBookingConfirmation({
    to: booking.customerEmail,
    reference: booking.reference,
    serviceName: booking.service.name,
    whenLabel: booking.startsAt.toISOString(),
    manageUrl: `${appUrl}/manage/${booking.manageToken}`,
    businessName: site.branding?.businessName || site.name,
  }).catch((err) => console.error("confirmation email failed", err));

  return booking;
}
