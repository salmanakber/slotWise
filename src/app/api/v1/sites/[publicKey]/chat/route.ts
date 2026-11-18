import { NextResponse } from "next/server";
import { z } from "zod";
import { answerCalendarQuestion } from "@/lib/ai-calendar-chat";
import { BookingError, loadSiteBundle } from "@/lib/booking/create";
import { canUse } from "@/lib/plan-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(500),
  sessionId: z.string().cuid().optional().nullable(),
  visitorKey: z.string().min(8).max(80),
  source: z.enum(["widget", "book_page", "designer_preview"]).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  }

  try {
    const site = await loadSiteBundle(publicKey);
    if (!site.calendarChatEnabled) {
      return NextResponse.json({ error: "Calendar chat is turned off" }, { status: 403 });
    }
    if (!canUse(site.plan?.tier, "ai_calendar_chat")) {
      return NextResponse.json(
        { error: "Calendar chat is available on Business and Agency plans" },
        { status: 403 },
      );
    }

    let session =
      parsed.data.sessionId
        ? await prisma.calendarChatSession.findFirst({
            where: { id: parsed.data.sessionId, siteId: site.id },
            include: { messages: { orderBy: { createdAt: "asc" }, take: 12 } },
          })
        : null;

    if (!session) {
      session = await prisma.calendarChatSession.create({
        data: {
          siteId: site.id,
          visitorKey: parsed.data.visitorKey,
          source: parsed.data.source || "widget",
          userAgent: request.headers.get("user-agent")?.slice(0, 240) || null,
        },
        include: { messages: true },
      });
    }

    if (session.messageCount >= 40) {
      return NextResponse.json(
        { error: "This chat reached its message limit. Start a new chat." },
        { status: 429 },
      );
    }

    const history = session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const answer = await answerCalendarQuestion({
      siteId: site.id,
      question: parsed.data.message,
      history,
    });

    const now = new Date();
    await prisma.$transaction([
      prisma.calendarChatMessage.create({
        data: {
          sessionId: session.id,
          role: "user",
          content: parsed.data.message,
        },
      }),
      prisma.calendarChatMessage.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: answer.reply,
          meta: {
            source: answer.source,
            suggestedEventIds: answer.suggestedEventIds,
          },
        },
      }),
      prisma.calendarChatSession.update({
        where: { id: session.id },
        data: {
          lastMessageAt: now,
          messageCount: { increment: 2 },
        },
      }),
    ]);

    const services = site.services
      .filter((s) => answer.suggestedEventIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
      }));

    return NextResponse.json({
      sessionId: session.id,
      reply: answer.reply,
      source: answer.source,
      suggestedQuestions: answer.suggestedQuestions,
      suggestedEvents: services,
      calendarChatEnabled: true,
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.code === "NOT_FOUND" ? 404 : 400 },
      );
    }
    console.error("[calendar-chat]", e);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 503 });
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await context.params;
  try {
    const site = await loadSiteBundle(publicKey);
    return NextResponse.json({
      enabled: Boolean(site.calendarChatEnabled && canUse(site.plan?.tier, "ai_calendar_chat")),
      prompts: [
        "What’s happening this weekend?",
        "Are there any free workshops?",
        "What’s the shortest session?",
        "How do I book?",
      ],
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.code === "NOT_FOUND" ? 404 : 400 },
      );
    }
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
