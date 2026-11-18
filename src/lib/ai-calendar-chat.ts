import { addDays, format, nextDay, type Day } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { getDaySlots } from "@/lib/booking/availability";
import { getPlatformSecrets } from "@/lib/platform-config";
import { prisma } from "@/lib/prisma";
import { formatCustomerPrice } from "@/lib/utils";

export type SuggestedSlot = {
  serviceId: string;
  serviceName: string;
  dateIso: string;
  start: string;
  end: string;
  label: string;
  priceCents?: number;
};

export type CalendarChatAnswer = {
  reply: string;
  source: "openai" | "groq" | "rules";
  suggestedEventIds: string[];
  suggestedSlots: SuggestedSlot[];
  suggestedQuestions: string[];
};

type EventCard = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMin: number;
  priceCents: number;
  locationType: string;
  featured: boolean;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeMin: number;
};

async function llmChat(opts: {
  url: string;
  apiKey: string;
  model: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string | null> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0.4,
      max_tokens: opts.maxTokens ?? 280,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

function weekendHint(q: string) {
  return /weekend|saturday|sunday|this week/i.test(q);
}
function freeHint(q: string) {
  return /free|no cost|complimentary|\$0|zero/i.test(q);
}
function workshopHint(q: string) {
  return /workshop|class|course|session|webinar/i.test(q);
}
function shortHint(q: string) {
  return /short|quick|brief|30|half.?hour|express/i.test(q);
}
function slotHint(q: string) {
  return /slot|available|availability|open(ing)?s?|free time|when can|what time|times?|book(ing)?|appoint|schedule|reserve/i.test(
    q,
  );
}

function scoreEvent(e: EventCard, question: string) {
  const q = question.toLowerCase();
  let score = 0;
  const hay = `${e.name} ${e.description || ""} ${e.category || ""} ${e.locationType}`.toLowerCase();
  for (const token of q.split(/\W+/).filter((t) => t.length > 2)) {
    if (hay.includes(token)) score += 2;
  }
  if (freeHint(question) && e.priceCents <= 0) score += 5;
  if (freeHint(question) && e.priceCents > 0) score -= 2;
  if (workshopHint(question) && /workshop|class|course|session/i.test(hay)) score += 4;
  if (shortHint(question)) score += Math.max(0, 4 - Math.floor(e.durationMin / 30));
  if (e.featured) score += 1;
  if (weekendHint(question)) score += 1;
  return score;
}

/** Resolve visitor date phrases → YYYY-MM-DD in site timezone (up to 3 days). */
export function resolveAskedDates(question: string, timezone: string): string[] {
  const now = toZonedTime(new Date(), timezone);
  const todayIso = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const q = question.toLowerCase();
  const out: string[] = [];
  const push = (d: Date) => {
    const iso = formatInTimeZone(d, timezone, "yyyy-MM-dd");
    if (!out.includes(iso)) out.push(iso);
  };

  const isoMatch = q.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) out.push(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);

  if (/\btoday\b/i.test(q)) push(now);
  if (/\btomorrow\b/i.test(q)) push(addDays(now, 1));

  const weekdayMap: Array<{ re: RegExp; day: Day }> = [
    { re: /\bsunday\b|\bsun\b/i, day: 0 },
    { re: /\bmonday\b|\bmon\b/i, day: 1 },
    { re: /\btuesday\b|\btues?\b/i, day: 2 },
    { re: /\bwednesday\b|\bwed\b/i, day: 3 },
    { re: /\bthursday\b|\bthurs?\b/i, day: 4 },
    { re: /\bfriday\b|\bfri\b/i, day: 5 },
    { re: /\bsaturday\b|\bsat\b/i, day: 6 },
  ];
  for (const { re, day } of weekdayMap) {
    if (re.test(q)) {
      const dow = now.getDay();
      if (dow === day && /\bthis\b|\btoday\b/i.test(q)) push(now);
      else push(nextDay(now, day));
    }
  }

  if (/\bweekend\b/i.test(q)) {
    // Next Sat + Sun
    push(nextDay(now, 6));
    push(nextDay(addDays(now, 1), 0));
  }

  if (!out.length && slotHint(question)) {
    // Default: today + next 2 days when asking about openings
    push(now);
    push(addDays(now, 1));
    push(addDays(now, 2));
  }

  // Prefer today first if present
  return out
    .filter((d) => d >= todayIso || out.length === 1)
    .slice(0, 3);
}

function matchEvents(events: EventCard[], question: string): EventCard[] {
  const scored = events
    .map((e) => ({ e, score: scoreEvent(e, question) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.e);
  if (scored.length) return scored.slice(0, 4);
  const featured = events.filter((e) => e.featured).slice(0, 3);
  return featured.length ? featured : events.slice(0, 3);
}

type SlotLookup = {
  dateIso: string;
  dateLabel: string;
  lines: string[];
  suggested: SuggestedSlot[];
};

async function lookupConcreteSlots(opts: {
  siteId: string;
  timezone: string;
  weekly: Array<{ dayOfWeek: number; enabled: boolean; startTime: string; endTime: string }>;
  timeOff: Array<{ startsAt: Date; endsAt: Date }>;
  events: EventCard[];
  dateIsos: string[];
  focusEvents: EventCard[];
}): Promise<SlotLookup[]> {
  const results: SlotLookup[] = [];
  const focus = opts.focusEvents.slice(0, 3);
  if (!focus.length || !opts.dateIsos.length) return results;

  for (const dateIso of opts.dateIsos) {
    const dayStart = new Date(`${dateIso}T00:00:00.000Z`);
    const dayEnd = addDays(dayStart, 1);
    const bookings = await prisma.booking.findMany({
      where: {
        siteId: opts.siteId,
        status: { not: "CANCELLED" },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { startsAt: true, endsAt: true, serviceId: true },
    });

    const dateLabel = formatInTimeZone(
      new Date(`${dateIso}T12:00:00.000Z`),
      opts.timezone,
      "EEE MMM d",
    );
    const lines: string[] = [];
    const suggested: SuggestedSlot[] = [];

    for (const ev of focus) {
      const relevant = bookings
        .filter((b) => b.serviceId === ev.id)
        .map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt }));
      // Also block overlapping any booking if staff pool is shared — use all bookings for safety
      const all = bookings.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt }));
      const slots = getDaySlots({
        date: new Date(`${dateIso}T12:00:00.000Z`),
        timezone: opts.timezone,
        durationMin: ev.durationMin,
        bufferBeforeMin: ev.bufferBeforeMin,
        bufferAfterMin: ev.bufferAfterMin,
        minNoticeMin: ev.minNoticeMin,
        weekly: opts.weekly,
        bookings: all.length ? all : relevant,
        timeOff: opts.timeOff,
      });
      const open = slots.filter((s) => s.available);
      if (!open.length) {
        lines.push(`${ev.name} on ${dateLabel}: no open times`);
        continue;
      }
      const sample = open.slice(0, 8);
      lines.push(
        `${ev.name} on ${dateLabel}: ${sample.map((s) => s.label).join(", ")}${
          open.length > sample.length ? ` (+${open.length - sample.length} more)` : ""
        }`,
      );
      for (const s of sample.slice(0, 6)) {
        suggested.push({
          serviceId: ev.id,
          serviceName: ev.name,
          dateIso,
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          label: s.label,
          priceCents: ev.priceCents,
        });
      }
    }

    results.push({ dateIso, dateLabel, lines, suggested });
  }

  return results;
}

function rulesAnswer(input: {
  siteName: string;
  currency: string;
  timezone: string;
  question: string;
  events: EventCard[];
  availabilityNotes: string[];
  slotLines: string[];
  suggestedSlots: SuggestedSlot[];
}): CalendarChatAnswer {
  const ranked = [...input.events]
    .map((e) => ({ e, score: scoreEvent(e, input.question) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.filter((r) => r.score > 0).slice(0, 4).map((r) => r.e);
  const picks = top.length ? top : input.events.filter((e) => e.featured).slice(0, 3);
  const pool = picks.length ? picks : input.events.slice(0, 3);

  if (!input.events.length) {
    return {
      reply: `Nothing bookable is published yet — check back soon.`,
      source: "rules",
      suggestedEventIds: [],
      suggestedSlots: [],
      suggestedQuestions: ["What services do you offer?", "How do I book?"],
    };
  }

  if (input.suggestedSlots.length) {
    const byDay = new Map<string, SuggestedSlot[]>();
    for (const s of input.suggestedSlots) {
      const list = byDay.get(s.dateIso) || [];
      list.push(s);
      byDay.set(s.dateIso, list);
    }
    const bits = [...byDay.entries()].slice(0, 2).map(([dateIso, slots]) => {
      const label = slots[0]
        ? formatInTimeZone(new Date(`${dateIso}T12:00:00Z`), input.timezone, "EEE MMM d")
        : dateIso;
      const times = [...new Set(slots.map((s) => s.label))].slice(0, 5).join(", ");
      const names = [...new Set(slots.map((s) => s.serviceName))].slice(0, 2).join(" / ");
      return `${names} on ${label}: ${times}`;
    });
    return {
      reply: `Open times — ${bits.join(" · ")}. Tap a time below to start booking.`,
      source: "rules",
      suggestedEventIds: [...new Set(input.suggestedSlots.map((s) => s.serviceId))],
      suggestedSlots: input.suggestedSlots.slice(0, 12),
      suggestedQuestions: [
        "What’s available tomorrow?",
        "Any free sessions?",
        "Show weekend openings",
      ],
    };
  }

  if (/how (do|can) i book|book(ing)?/i.test(input.question)) {
    return {
      reply: `Ask for a day (e.g. “Friday openings”), tap a time, then enter your details — or pick an event on the calendar.`,
      source: "rules",
      suggestedEventIds: pool.map((e) => e.id),
      suggestedSlots: [],
      suggestedQuestions: [
        "What’s available today?",
        "What’s happening this weekend?",
        "Are there any free workshops?",
      ],
    };
  }

  if (freeHint(input.question)) {
    const frees = input.events.filter((e) => e.priceCents <= 0);
    if (!frees.length) {
      return {
        reply: `No free events right now. Try: ${pool
          .slice(0, 2)
          .map((e) => e.name)
          .join(" or ")}.`,
        source: "rules",
        suggestedEventIds: pool.map((e) => e.id),
        suggestedSlots: [],
        suggestedQuestions: ["What’s available today?", "Show short sessions", "How do I book?"],
      };
    }
    return {
      reply: `Yes — free options: ${frees
        .slice(0, 3)
        .map((e) => e.name)
        .join(", ")}. Ask for a day to see open times.`,
      source: "rules",
      suggestedEventIds: frees.slice(0, 4).map((e) => e.id),
      suggestedSlots: [],
      suggestedQuestions: ["What’s available tomorrow?", "How do I book?", "Any workshops?"],
    };
  }

  if (shortHint(input.question)) {
    const shorts = [...input.events].sort((a, b) => a.durationMin - b.durationMin).slice(0, 3);
    return {
      reply: `Quickest: ${shorts.map((e) => `${e.name} (${e.durationMin}m)`).join(", ")}.`,
      source: "rules",
      suggestedEventIds: shorts.map((e) => e.id),
      suggestedSlots: [],
      suggestedQuestions: ["Any free options?", "What’s available today?", "How do I book?"],
    };
  }

  const intro = weekendHint(input.question) ? `This weekend, try:` : `Good matches:`;
  const availBit = input.slotLines[0] || input.availabilityNotes[0] || "";

  return {
    reply: `${intro} ${pool
      .slice(0, 3)
      .map((e) => e.name)
      .join(", ")}.${availBit ? ` ${availBit}` : ""} Ask a day to see exact times.`,
    source: "rules",
    suggestedEventIds: pool.map((e) => e.id),
    suggestedSlots: [],
    suggestedQuestions: [
      "What’s available today?",
      "Are there any free workshops?",
      "How do I book?",
    ],
  };
}

async function buildCalendarContext(siteId: string, question: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      branding: true,
      services: { where: { active: true }, orderBy: { sortOrder: "asc" }, take: 40 },
      availability: { where: { staffId: null }, orderBy: { dayOfWeek: "asc" } },
      timeOff: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 20 },
      staff: { where: { active: true }, take: 12, select: { id: true, name: true } },
    },
  });
  if (!site) throw new Error("Site not found");

  const events: EventCard[] = site.services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    durationMin: s.durationMin,
    priceCents: s.priceCents,
    locationType: s.locationType,
    featured: s.featured,
    bufferBeforeMin: s.bufferBeforeMin,
    bufferAfterMin: s.bufferAfterMin,
    minNoticeMin: s.minNoticeMin,
  }));

  const weekly = site.availability.map((a) => ({
    dayOfWeek: a.dayOfWeek,
    enabled: a.enabled,
    startTime: a.startTime,
    endTime: a.endTime,
  }));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hoursSummary = weekly.length
    ? weekly
        .filter((w) => w.enabled)
        .map((w) => `${dayNames[w.dayOfWeek]} ${w.startTime}-${w.endTime}`)
        .join(", ")
    : "Hours not configured — default weekday openings may apply";

  const focusEvents = matchEvents(events, question);
  const askedDates = resolveAskedDates(question, site.timezone);
  const concrete = await lookupConcreteSlots({
    siteId: site.id,
    timezone: site.timezone,
    weekly,
    timeOff: site.timeOff.map((t) => ({ startsAt: t.startsAt, endsAt: t.endsAt })),
    events,
    dateIsos: askedDates,
    focusEvents,
  });

  const suggestedSlots = concrete.flatMap((c) => c.suggested).slice(0, 12);
  const slotLines = concrete.flatMap((c) => c.lines);

  // Broad 7-day count snapshot for general questions
  const horizon = 7;
  const rangeStart = new Date();
  const rangeEnd = addDays(rangeStart, horizon + 1);
  const bookings = await prisma.booking.findMany({
    where: {
      siteId: site.id,
      status: { not: "CANCELLED" },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { startsAt: true, endsAt: true },
  });

  const openByDay: string[] = [];
  const sampleEvents = (focusEvents.length ? focusEvents : events).slice(0, 5);
  for (let i = 0; i < horizon; i++) {
    const day = addDays(new Date(), i);
    const dateIso = formatInTimeZone(day, site.timezone, "yyyy-MM-dd");
    const label = formatInTimeZone(day, site.timezone, "EEE MMM d");
    const dayBookings = bookings.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt }));
    let openTotal = 0;
    const perEvent: string[] = [];
    for (const ev of sampleEvents) {
      const slots = getDaySlots({
        date: new Date(`${dateIso}T12:00:00.000Z`),
        timezone: site.timezone,
        durationMin: ev.durationMin,
        bufferBeforeMin: ev.bufferBeforeMin,
        bufferAfterMin: ev.bufferAfterMin,
        minNoticeMin: ev.minNoticeMin,
        weekly,
        bookings: dayBookings,
        timeOff: site.timeOff.map((t) => ({ startsAt: t.startsAt, endsAt: t.endsAt })),
      });
      const open = slots.filter((s) => s.available).length;
      openTotal += open;
      if (open > 0) perEvent.push(`${ev.name}: ${open}`);
    }
    openByDay.push(
      openTotal > 0
        ? `${label}: ${openTotal} opens${perEvent.length ? ` (${perEvent.slice(0, 3).join("; ")})` : ""}`
        : `${label}: no opens in focus events`,
    );
  }

  const availabilityNotes: string[] = [];
  if (slotLines.length) availabilityNotes.push(...slotLines.slice(0, 6));
  const weekendDays = openByDay.filter((l) => /Sat|Sun/.test(l)).slice(0, 2);
  if (weekendDays.length) availabilityNotes.push(`Weekend: ${weekendDays.join(" · ")}`);

  const timeOffNote =
    site.timeOff.length > 0
      ? `Upcoming time off: ${site.timeOff
          .slice(0, 3)
          .map((t) => `${format(t.startsAt, "MMM d")}–${format(t.endsAt, "MMM d")}`)
          .join(", ")}`
      : "";

  return {
    site,
    events,
    hoursSummary,
    openByDay,
    availabilityNotes,
    timeOffNote,
    staffNames: site.staff.map((s) => s.name),
    suggestedSlots,
    slotLines,
    askedDates,
    focusEvents,
  };
}

export async function answerCalendarQuestion(input: {
  siteId: string;
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<CalendarChatAnswer> {
  const ctx = await buildCalendarContext(input.siteId, input.question);
  const {
    site,
    events,
    hoursSummary,
    openByDay,
    availabilityNotes,
    timeOffNote,
    staffNames,
    suggestedSlots,
    slotLines,
    askedDates,
    focusEvents,
  } = ctx;
  const siteName = site.branding?.businessName || site.name;
  const nowLocal = formatInTimeZone(new Date(), site.timezone, "EEEE, MMM d yyyy · HH:mm zzz");

  const catalog = events
    .map((e) => {
      const price = formatCustomerPrice(e.priceCents, site.currency) || "Free";
      return `- id=${e.id} | "${e.name}" | ${e.durationMin} min | ${price} | ${e.locationType} | category=${e.category || "general"} | featured=${e.featured} | ${e.description || "no description"}`;
    })
    .join("\n");

  const concreteBlock = slotLines.length
    ? `CONCRETE OPEN TIMES (authoritative — use these exact times, never invent):\n${slotLines.join("\n")}`
    : askedDates.length
      ? `CONCRETE OPEN TIMES: none found for ${askedDates.join(", ")} on focus events.`
      : "CONCRETE OPEN TIMES: visitor did not ask a specific day yet — give counts from the snapshot and invite them to name a day.";

  const system = `You are the booking assistant for "${siteName}" (Slotwise Calendar Chat).
You help visitors find real open appointment times and start a booking.

Style: clear and helpful. 2–4 short sentences OR up to 5 tight bullets. List real clock times when available. No markdown headings, no emoji spam.

Calendar facts:
- Timezone: ${site.timezone} · Now: ${nowLocal}
- Currency: ${site.currency}
- Hours: ${hoursSummary}
- Staff: ${staffNames.length ? staffNames.join(", ") : "not listed"}
${timeOffNote ? `- ${timeOffNote}` : ""}

Rules:
1) ONLY use the catalog + availability blocks. Never invent events, prices, or times.
2) When CONCRETE OPEN TIMES lists times, quote those exact labels (e.g. 2:00 PM).
3) If they want to book, tell them to tap a time chip below (the UI starts booking for them).
4) Name events exactly as in the catalog.
5) If no times, say so and suggest another day or event.
6) Focus events for this question: ${focusEvents.map((e) => e.name).join(", ") || "general"}.`;

  const contextBlock = `EVENT CATALOG:\n${catalog || "(no active events)"}\n\n${concreteBlock}\n\nAVAILABILITY COUNTS (next ~7 days):\n${openByDay.join("\n")}\n\nNOTES:\n${availabilityNotes.join("\n") || "none"}`;

  const historyMsgs = (input.history || []).slice(-8);
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...historyMsgs,
    {
      role: "user",
      content: `${contextBlock}\n\nVisitor question: ${input.question}`,
    },
  ];

  const secrets = await getPlatformSecrets();
  const provider = secrets.aiProvider || "openai";
  let text: string | null = null;
  let source: CalendarChatAnswer["source"] = "rules";
  const maxTokens = suggestedSlots.length || slotHint(input.question) ? 320 : 200;

  if (provider !== "template") {
    const run = async (url: string, apiKey: string, model: string, src: "openai" | "groq") => {
      const out = await llmChat({ url, apiKey, model, system, messages, maxTokens });
      if (out) {
        text = out;
        source = src;
      }
    };
    if (provider === "groq" && secrets.groqApiKey) {
      await run(
        "https://api.groq.com/openai/v1/chat/completions",
        secrets.groqApiKey,
        secrets.groqModel || "llama-3.3-70b-versatile",
        "groq",
      );
    } else if (secrets.openaiApiKey) {
      await run(
        "https://api.openai.com/v1/chat/completions",
        secrets.openaiApiKey,
        secrets.openaiModel || "gpt-4o-mini",
        "openai",
      );
    } else if (secrets.groqApiKey) {
      await run(
        "https://api.groq.com/openai/v1/chat/completions",
        secrets.groqApiKey,
        secrets.groqModel || "llama-3.3-70b-versatile",
        "groq",
      );
    }
  }

  if (!text) {
    return rulesAnswer({
      siteName,
      currency: site.currency,
      timezone: site.timezone,
      question: input.question,
      events,
      availabilityNotes,
      slotLines,
      suggestedSlots,
    });
  }

  const mentioned = events
    .filter((e) => text!.toLowerCase().includes(e.name.toLowerCase()))
    .slice(0, 4);
  const fallback = rulesAnswer({
    siteName,
    currency: site.currency,
    timezone: site.timezone,
    question: input.question,
    events,
    availabilityNotes,
    slotLines,
    suggestedSlots,
  });

  return {
    reply: text,
    source,
    suggestedEventIds: mentioned.length
      ? mentioned.map((e) => e.id)
      : suggestedSlots.length
        ? [...new Set(suggestedSlots.map((s) => s.serviceId))]
        : fallback.suggestedEventIds,
    suggestedSlots: suggestedSlots.length ? suggestedSlots : fallback.suggestedSlots,
    suggestedQuestions: [
      "What’s available today?",
      "What’s available tomorrow?",
      "Show weekend openings",
      "How do I book?",
    ],
  };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getCalendarChatAnalytics(siteId: string) {
  const now = new Date();
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day14 = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

  const [
    sessionsAll,
    sessions7,
    sessions30,
    messagesAll,
    messages7,
    recentSessions,
    topQuestions,
    sessions14,
    userMessages14,
  ] = await Promise.all([
    prisma.calendarChatSession.count({ where: { siteId } }),
    prisma.calendarChatSession.count({ where: { siteId, startedAt: { gte: day7 } } }),
    prisma.calendarChatSession.count({ where: { siteId, startedAt: { gte: day30 } } }),
    prisma.calendarChatMessage.count({
      where: { session: { siteId }, role: "user" },
    }),
    prisma.calendarChatMessage.count({
      where: { session: { siteId }, role: "user", createdAt: { gte: day7 } },
    }),
    prisma.calendarChatSession.findMany({
      where: { siteId },
      orderBy: { lastMessageAt: "desc" },
      take: 12,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 4 },
      },
    }),
    prisma.calendarChatMessage.findMany({
      where: { session: { siteId }, role: "user" },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { content: true, createdAt: true },
    }),
    prisma.calendarChatSession.findMany({
      where: { siteId, startedAt: { gte: day14 } },
      select: { startedAt: true, source: true },
    }),
    prisma.calendarChatMessage.findMany({
      where: { session: { siteId }, role: "user", createdAt: { gte: day14 } },
      select: { createdAt: true },
    }),
  ]);

  const questionBuckets = new Map<string, number>();
  for (const q of topQuestions) {
    const key = q.content.trim().slice(0, 120);
    if (!key) continue;
    questionBuckets.set(key, (questionBuckets.get(key) || 0) + 1);
  }
  const popularQuestions = [...questionBuckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([question, count]) => ({ question, count }));

  const dailyMap = new Map<string, { sessions: number; questions: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(dayKey(d), { sessions: 0, questions: 0 });
  }
  for (const s of sessions14) {
    const k = dayKey(s.startedAt);
    const row = dailyMap.get(k);
    if (row) row.sessions += 1;
  }
  for (const m of userMessages14) {
    const k = dayKey(m.createdAt);
    const row = dailyMap.get(k);
    if (row) row.questions += 1;
  }
  const daily = [...dailyMap.entries()].map(([date, v]) => ({
    date,
    label: format(new Date(`${date}T12:00:00Z`), "MMM d"),
    sessions: v.sessions,
    questions: v.questions,
  }));

  const sourceBuckets = new Map<string, number>();
  for (const s of sessions14) {
    const key = s.source || "widget";
    sourceBuckets.set(key, (sourceBuckets.get(key) || 0) + 1);
  }
  const bySource = [...sourceBuckets.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totals: {
      sessionsAll,
      sessions7,
      sessions30,
      messagesAll,
      messages7,
      avgMessagesPerSession: sessionsAll ? Math.round((messagesAll / sessionsAll) * 10) / 10 : 0,
    },
    daily,
    bySource,
    popularQuestions,
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      visitorKey: s.visitorKey.slice(0, 8),
      messageCount: s.messageCount,
      startedAt: s.startedAt.toISOString(),
      lastMessageAt: s.lastMessageAt.toISOString(),
      source: s.source,
      preview: s.messages
        .filter((m) => m.role === "user")
        .slice(0, 1)
        .map((m) => m.content)[0] || "—",
      lastAssistant:
        s.messages.find((m) => m.role === "assistant")?.content?.slice(0, 160) || null,
    })),
  };
}
