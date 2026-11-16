import { addMinutes, format, isBefore, parse, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type WeeklyRule = {
  dayOfWeek: number; // 0=Sun
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string;
};

export type ExistingBooking = {
  startsAt: Date;
  endsAt: Date;
};

export type SlotOptions = {
  date: Date; // calendar day in business timezone (any time ok)
  timezone: string;
  durationMin: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  minNoticeMin?: number;
  slotStepMin?: number;
  weekly: WeeklyRule[];
  bookings: ExistingBooking[];
  timeOff?: Array<{ startsAt: Date; endsAt: Date }>;
  now?: Date;
};

export type Slot = {
  start: Date;
  end: Date;
  label: string;
  available: boolean;
  reason?: "past" | "booked" | "time_off" | "outside_hours";
};

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

/** Generate candidate slots for one local calendar day. */
export function getDaySlots(opts: SlotOptions): Slot[] {
  const {
    timezone,
    durationMin,
    bufferBeforeMin = 0,
    bufferAfterMin = 0,
    minNoticeMin = 0,
    slotStepMin = 30,
    weekly,
    bookings,
    timeOff = [],
    now = new Date(),
  } = opts;

  const localDay = toZonedTime(opts.date, timezone);
  const dayStartLocal = startOfDay(localDay);
  const dow = dayStartLocal.getDay();
  const rule = weekly.find((w) => w.dayOfWeek === dow);

  if (!rule || !rule.enabled) return [];

  const openLocal = parse(rule.startTime, "HH:mm", dayStartLocal);
  const closeLocal = parse(rule.endTime, "HH:mm", dayStartLocal);
  if (!isBefore(openLocal, closeLocal)) return [];

  const slots: Slot[] = [];
  let cursor = openLocal;

  while (addMinutes(cursor, durationMin) <= closeLocal) {
    const startLocal = cursor;
    const endLocal = addMinutes(cursor, durationMin);
    const startUtc = fromZonedTime(startLocal, timezone);
    const endUtc = fromZonedTime(endLocal, timezone);
    const blockedStart = addMinutes(startUtc, -bufferBeforeMin);
    const blockedEnd = addMinutes(endUtc, bufferAfterMin);

    let available = true;
    let reason: Slot["reason"];

    const earliest = addMinutes(now, minNoticeMin);
    if (startUtc < earliest) {
      available = false;
      reason = "past";
    } else if (timeOff.some((t) => overlaps(blockedStart, blockedEnd, t.startsAt, t.endsAt))) {
      available = false;
      reason = "time_off";
    } else if (bookings.some((b) => overlaps(blockedStart, blockedEnd, b.startsAt, b.endsAt))) {
      available = false;
      reason = "booked";
    }

    slots.push({
      start: startUtc,
      end: endUtc,
      label: format(startLocal, "HH:mm"),
      available,
      reason: available ? undefined : reason,
    });

    cursor = addMinutes(cursor, slotStepMin);
  }

  return slots;
}

/** Prefer earlier contiguous openings — reduces schedule gaps (P2 smart ranking lite). */
export function rankSlots(slots: Slot[]): Slot[] {
  const open = slots.filter((s) => s.available);
  const closed = slots.filter((s) => !s.available);
  open.sort((a, b) => a.start.getTime() - b.start.getTime());
  return [...open, ...closed];
}
