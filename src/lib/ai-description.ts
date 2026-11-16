/** Generate event/service descriptions. Uses OpenAI when configured; otherwise a strong template writer. */

const TONES = ["professional", "friendly", "premium", "concise"] as const;

export async function generateEventDescription(input: {
  title: string;
  category?: string | null;
  durationMin?: number;
  locationType?: string;
  tone?: (typeof TONES)[number];
}) {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const tone = input.tone && TONES.includes(input.tone) ? input.tone : "friendly";
  const category = input.category?.trim() || "service";
  const mins = input.durationMin ?? 30;
  const location =
    input.locationType === "online"
      ? "online"
      : input.locationType === "phone"
        ? "by phone"
        : input.locationType === "hybrid"
          ? "in person or online"
          : "in person";

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 220,
          messages: [
            {
              role: "system",
              content:
                "You write short booking-service descriptions for Webflow businesses. 2–3 sentences, no hype spam, no emojis unless natural. Mention what clients get and who it’s for.",
            },
            {
              role: "user",
              content: `Title: ${title}\nCategory: ${category}\nDuration: ${mins} minutes\nLocation: ${location}\nTone: ${tone}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return { description: text, source: "openai" as const };
      }
    } catch {
      /* fall through */
    }
  }

  const openers: Record<(typeof TONES)[number], string> = {
    professional: `${title} is a focused ${mins}-minute ${category} designed for clients who want clear outcomes.`,
    friendly: `Book ${title} — a ${mins}-minute ${category} that keeps things simple and useful.`,
    premium: `${title} is a polished ${mins}-minute ${category} experience tailored for clients who value detail.`,
    concise: `${title}: ${mins} minutes of expert ${category} help.`,
  };

  const mid = `Sessions run ${location}, with space to cover priorities, answer questions, and leave with next steps.`;
  const close =
    tone === "concise"
      ? "Ideal when you need momentum without a long commitment."
      : "Perfect for first-time bookings or returning clients who want a reliable slot on your calendar.";

  return {
    description: `${openers[tone]} ${mid} ${close}`,
    source: "template" as const,
  };
}
