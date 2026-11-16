import { getPlatformSecrets } from "@/lib/platform-config";

/** Generate event/service descriptions via OpenAI, Groq, or template fallback. */

const TONES = ["professional", "friendly", "premium", "concise"] as const;

type ChatResult = { description: string; source: "openai" | "groq" | "template" };

async function chatCompletion(opts: {
  url: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<string | null> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0.7,
      max_tokens: 220,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

function templateDescription(input: {
  title: string;
  category: string;
  mins: number;
  location: string;
  tone: (typeof TONES)[number];
}): ChatResult {
  const openers: Record<(typeof TONES)[number], string> = {
    professional: `${input.title} is a focused ${input.mins}-minute ${input.category} designed for clients who want clear outcomes.`,
    friendly: `Book ${input.title} — a ${input.mins}-minute ${input.category} that keeps things simple and useful.`,
    premium: `${input.title} is a polished ${input.mins}-minute ${input.category} experience tailored for clients who value detail.`,
    concise: `${input.title}: ${input.mins} minutes of expert ${input.category} help.`,
  };
  const mid = `Sessions run ${input.location}, with space to cover priorities, answer questions, and leave with next steps.`;
  const close =
    input.tone === "concise"
      ? "Ideal when you need momentum without a long commitment."
      : "Perfect for first-time bookings or returning clients who want a reliable slot on your calendar.";
  return {
    description: `${openers[input.tone]} ${mid} ${close}`,
    source: "template",
  };
}

export async function generateEventDescription(input: {
  title: string;
  category?: string | null;
  durationMin?: number;
  locationType?: string;
  tone?: (typeof TONES)[number];
}): Promise<ChatResult> {
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

  const system =
    "You write short booking-service descriptions for Webflow businesses. 2–3 sentences, no hype spam, no emojis unless natural. Mention what clients get and who it’s for.";
  const user = `Title: ${title}\nCategory: ${category}\nDuration: ${mins} minutes\nLocation: ${location}\nTone: ${tone}`;

  const secrets = await getPlatformSecrets();
  const provider = secrets.aiProvider || "openai";

  if (provider === "template") {
    return templateDescription({ title, category, mins, location, tone });
  }

  if (provider === "groq" && secrets.groqApiKey) {
    try {
      const text = await chatCompletion({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: secrets.groqApiKey,
        model: secrets.groqModel || "llama-3.3-70b-versatile",
        system,
        user,
      });
      if (text) return { description: text, source: "groq" };
    } catch {
      /* fall through */
    }
  }

  if ((provider === "openai" || provider === "groq") && secrets.openaiApiKey) {
    try {
      const text = await chatCompletion({
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: secrets.openaiApiKey,
        model: secrets.openaiModel || "gpt-4o-mini",
        system,
        user,
      });
      if (text) return { description: text, source: "openai" };
    } catch {
      /* fall through */
    }
  }

  // If preferred was openai but missing, try groq once
  if (provider === "openai" && secrets.groqApiKey) {
    try {
      const text = await chatCompletion({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: secrets.groqApiKey,
        model: secrets.groqModel || "llama-3.3-70b-versatile",
        system,
        user,
      });
      if (text) return { description: text, source: "groq" };
    } catch {
      /* fall through */
    }
  }

  return templateDescription({ title, category, mins, location, tone });
}
