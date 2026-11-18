import { addDays, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getDaySlots } from "@/lib/booking/availability";
import { getPlatformSecrets } from "@/lib/platform-config";
import { prisma } from "@/lib/prisma";
import { formatCustomerPrice } from "@/lib/utils";

export type CalendarChatAnswer = {
  reply: string;
  source: "openai" | "groq" | "rules";
  suggestedEventIds: string[];
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
}): Promise<string | null> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0.55,
      max_tokens: 140,
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

function rulesAnswer(input: {
  siteName: string;
  currency: string;
  timezone: string;
  question: string;
  events: EventCard[];
  availabilityNotes: string[];
}): CalendarChatAnswer {
  const ranked = [...input.events]
    .map((e) => ({ e, score: scoreEvent(e, input.question) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.filter((r) => r.score > 0).slice(0, 4).map((r) => r.e);
  const picks = top.length ? top : input.events.filter((e) => e.featured).slice(0, 3);
  const pool = picks.length ? picks : input.events.slice(0, 3);
  const availBit = input.availabilityNotes.slice(0, 2).join(" ");

  if (!input.events.length) {
    return {
      reply: `Nothing bookable is published yet — check back soon.`,
      source: "rules",
      suggestedEventIds: [],
      suggestedQuestions: ["What services do you offer?", "How do I book?"],
    };
  }

  if (/how (do|can) i book|book(ing)?/i.test(input.question)) {
    return {
      reply: `Pick an event, choose a time (${input.timezone}), then enter your details — you’re set.`,
      source: "rules",
      suggestedEventIds: pool.map((e) => e.id),
      suggestedQuestions: [
        "What’s happening this weekend?",
        "Are there any free workshops?",
        "Which events are shortest?",
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
        suggestedQuestions: ["What’s popular?", "Show short sessions", "How do I book?"],
      };
    }
    return {
      reply: `Yes — free options: ${frees
        .slice(0, 3)
        .map((e) => e.name)
        .join(", ")}. Tap one to book.`,
      source: "rules",
      suggestedEventIds: frees.slice(0, 4).map((e) => e.id),
      suggestedQuestions: ["What’s happening this weekend?", "How do I book?", "Any workshops?"],
    };
  }

  if (shortHint(input.question)) {
    const shorts = [...input.events].sort((a, b) => a.durationMin - b.durationMin).slice(0, 3);
    return {
      reply: `Quickest: ${shorts.map((e) => `${e.name} (${e.durationMin}m)`).join(", ")}.`,
      source: "rules",
      suggestedEventIds: shorts.map((e) => e.id),
      suggestedQuestions: ["Any free options?", "What’s this weekend?", "How do I book?"],
    };
  }

  let intro = weekendHint(input.question)
    ? `This weekend, try:`
    : `Good matches:`;

  return {
    reply: `${intro} ${pool
      .slice(0, 3)
      .map((e) => e.name)
      .join(", ")}.${availBit ? ` ${availBit}` : ""}`,
    source: "rules",
    suggestedEventIds: pool.map((e) => e.id),
    suggestedQuestions: [
      "Are there any free workshops?",
      "What’s the shortest session?",
      "How do I book?",
    ],
  };
}

async function buildCalendarContext(siteId: string) {
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

  const horizon = 10;
  const rangeStart = new Date();
  const rangeEnd = addDays(rangeStart, horizon + 1);
  const bookings = await prisma.booking.findMany({
    where: {
      siteId: site.id,
      status: { not: "CANCELLED" },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { startsAt: true, endsAt: true, serviceId: true },
  });

  const sampleEvents = events.slice(0, 6);
  const availabilityNotes: string[] = [];
  const openByDay: string[] = [];

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
      if (open > 0) perEvent.push(`${ev.name}: ${open} opens`);
    }
    if (openTotal > 0) {
      openByDay.push(`${label}: ${openTotal} open slots${perEvent.length ? ` (${perEvent.slice(0, 3).join("; ")})` : ""}`);
    } else {
      openByDay.push(`${label}: limited / no open slots in sample events`);
    }
  }

  const weekendDays = openByDay.filter((l) => /Sat|Sun/.test(l)).slice(0, 2);
  if (weekendDays.length) {
    availabilityNotes.push(`Weekend snapshot: ${weekendDays.join(" · ")}`);
  }
  const soon = openByDay.find((l) => !/limited/.test(l));
  if (soon) availabilityNotes.push(`Soonest openings look like: ${soon}.`);

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
  };
}

export async function answerCalendarQuestion(input: {
  siteId: string;
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<CalendarChatAnswer> {
  const ctx = await buildCalendarContext(input.siteId);
  const { site, events, hoursSummary, openByDay, availabilityNotes, timeOffNote, staffNames } = ctx;
  const siteName = site.branding?.businessName || site.name;
  const nowLocal = formatInTimeZone(new Date(), site.timezone, "EEEE, MMM d yyyy · HH:mm zzz");

  const catalog = events
    .map((e) => {
      const price = formatCustomerPrice(e.priceCents, site.currency) || "Free";
      return `- id=${e.id} | "${e.name}" | ${e.durationMin} min | ${price} | ${e.locationType} | category=${e.category || "general"} | featured=${e.featured} | ${e.description || "no description"}`;
    })
    .join("\n");

  const system = `You are the friendly front-desk assistant for "${siteName}" (Slotwise Calendar Chat, BETA).
Keep replies SHORT: 1–2 sentences, or at most 3 tight bullets. Aim under ~220 characters unless listing 2–3 event names. No fluff, no markdown headings, no emoji spam.

Grounded in THIS calendar only:
- Timezone: ${site.timezone} · Now: ${nowLocal}
- Currency: ${site.currency}
- Hours: ${hoursSummary}
- Staff: ${staffNames.length ? staffNames.join(", ") : "not listed"}
${timeOffNote ? `- ${timeOffNote}` : ""}

Rules:
1) ONLY use the catalog + availability. Never invent events, prices, or times.
2) Name events exactly so visitors can tap them.
3) Prefer one clear recommendation over long lists.
4) If unsure, ask one short question.`;

  const contextBlock = `EVENT CATALOG:\n${catalog || "(no active events)"}\n\nAVAILABILITY SNAPSHOT (next ~10 days, open slot counts):\n${openByDay.join("\n")}\n\nNOTES:\n${availabilityNotes.join("\n") || "none"}`;

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

  if (provider !== "template") {
    if (provider === "groq" && secrets.groqApiKey) {
      text = await llmChat({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: secrets.groqApiKey,
        model: secrets.groqModel || "llama-3.3-70b-versatile",
        system,
        messages,
      });
      if (text) source = "groq";
    } else if (secrets.openaiApiKey) {
      text = await llmChat({
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: secrets.openaiApiKey,
        model: secrets.openaiModel || "gpt-4o-mini",
        system,
        messages,
      });
      if (text) source = "openai";
    } else if (secrets.groqApiKey) {
      text = await llmChat({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: secrets.groqApiKey,
        model: secrets.groqModel || "llama-3.3-70b-versatile",
        system,
        messages,
      });
      if (text) source = "groq";
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
    });
  }

  const mentioned = events
    .filter((e) => text!.toLowerCase().includes(e.name.toLowerCase()))
    .slice(0, 4);
  const fallbackIds = rulesAnswer({
    siteName,
    currency: site.currency,
    timezone: site.timezone,
    question: input.question,
    events,
    availabilityNotes,
  }).suggestedEventIds;

  return {
    reply: text,
    source,
    suggestedEventIds: mentioned.length ? mentioned.map((e) => e.id) : fallbackIds,
    suggestedQuestions: [
      "What’s happening this weekend?",
      "Are there any free workshops?",
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
