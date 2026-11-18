"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatCustomerPrice } from "@/lib/utils";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  events?: Array<{ id: string; name: string; durationMin: number; priceCents: number }>;
};

type Props = {
  publicKey: string;
  currency: string;
  accent: string;
  onAccent: string;
  ink: string;
  line: string;
  panel: string;
  mut: string;
  radius: number;
  enabled: boolean;
  source?: "widget" | "book_page" | "designer_preview";
  onPickEvent?: (serviceId: string) => void;
};

function visitorKey() {
  if (typeof window === "undefined") return "server";
  const k = "sw_chat_vk";
  let v = localStorage.getItem(k);
  if (!v) {
    v = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(k, v);
  }
  return v;
}

const DEFAULT_PROMPTS = [
  "What’s happening this weekend?",
  "Are there any free workshops?",
  "What’s the shortest session?",
  "How do I book?",
];

export function CalendarChat({
  publicKey,
  currency,
  accent,
  onAccent,
  ink,
  line,
  panel,
  mut,
  radius,
  enabled,
  source = "widget",
  onPickEvent,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask me anything about this calendar — weekends, free workshops, short sessions, or how to book.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    fetch(`/api/v1/sites/${publicKey}/chat`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.prompts) && d.prompts.length) setPrompts(d.prompts);
      })
      .catch(() => undefined);
  }, [publicKey, enabled]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, busy]);

  const r = Math.max(radius - 6, 10);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput("");
    const userId = `u_${Date.now()}`;
    setMsgs((m) => [...m, { id: userId, role: "user", content: message }]);
    try {
      const res = await fetch(`/api/v1/sites/${publicKey}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId,
          visitorKey: visitorKey(),
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      if (typeof data.sessionId === "string") setSessionId(data.sessionId);
      setMsgs((m) => [
        ...m,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: data.reply || "I couldn’t find a match — try another question.",
          events: data.suggestedEvents || [],
        },
      ]);
      if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length) {
        setPrompts(data.suggestedQuestions);
      }
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          content: e instanceof Error ? e.message : "Chat is temporarily unavailable.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const chipPrompts = useMemo(() => prompts.slice(0, 3), [prompts]);

  if (!enabled) return null;

  return (
    <div className="sw-chat" style={{ borderTop: `1px solid ${line}` }}>
      <style>{`
        .sw-chat-panel { animation: sw-w-in .28s cubic-bezier(.2,.8,.2,1) both; }
        .sw-chat-bubble { max-width: 92%; white-space: pre-wrap; word-break: break-word; }
        .sw-chat-scroll::-webkit-scrollbar { width: 3px; }
        .sw-chat-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, currentColor 20%, transparent); border-radius: 99px; }
      `}</style>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:brightness-[0.98]"
          style={{ background: `color-mix(in srgb, ${accent} 8%, ${panel})` }}
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center text-[13px] font-black"
            style={{
              borderRadius: r,
              background: `linear-gradient(145deg, ${accent}, color-mix(in srgb, ${accent} 55%, ${ink}))`,
              color: onAccent,
              boxShadow: `0 6px 16px color-mix(in srgb, ${accent} 35%, transparent)`,
            }}
            aria-hidden
          >
            ✦
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[12.5px] font-extrabold tracking-tight">
                Ask the calendar
              </span>
              <em
                className="rounded px-1 py-px text-[8px] font-black uppercase tracking-[0.08em]"
                style={{
                  background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                  color: accent,
                }}
              >
                Beta
              </em>
            </span>
            <span className="block truncate text-[10.5px]" style={{ color: mut }}>
              “What’s free this weekend?” — instant answers
            </span>
          </span>
          <span className="text-[11px] font-bold" style={{ color: accent }}>
            Chat
          </span>
        </button>
      ) : (
        <div className="sw-chat-panel flex max-h-[240px] flex-col" style={{ background: panel }}>
          <div
            className="flex items-center justify-between gap-2 px-3 py-2"
            style={{ borderBottom: `1px solid ${line}` }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-extrabold">Calendar AI</span>
                <em
                  className="rounded px-1 py-px text-[8px] font-black uppercase tracking-[0.08em]"
                  style={{
                    background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                    color: accent,
                  }}
                >
                  Beta
                </em>
              </div>
              <div className="text-[10px]" style={{ color: mut }}>
                Answers from your live events
              </div>
            </div>
            <button
              type="button"
              className="text-[11px] font-bold"
              style={{ color: mut }}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div ref={scroller} className="sw-chat-scroll flex-1 space-y-2 overflow-y-auto px-2.5 py-2">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="sw-chat-bubble px-2.5 py-1.5 text-[11.5px] leading-snug"
                  style={{
                    borderRadius: r,
                    background:
                      m.role === "user"
                        ? accent
                        : `color-mix(in srgb, ${ink} 5%, ${panel})`,
                    color: m.role === "user" ? onAccent : ink,
                    border: m.role === "user" ? "none" : `1px solid ${line}`,
                  }}
                >
                  {m.content}
                  {m.events && m.events.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.events.map((ev) => {
                        const price = formatCustomerPrice(ev.priceCents, currency);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              onPickEvent?.(ev.id);
                              setOpen(false);
                            }}
                            className="rounded-md px-1.5 py-1 text-left text-[10.5px] font-bold"
                            style={{
                              background: panel,
                              border: `1px solid ${line}`,
                              color: ink,
                            }}
                          >
                            {ev.name}
                            <span className="block font-medium" style={{ color: mut }}>
                              {ev.durationMin}m{price ? ` · ${price}` : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="text-[10.5px] font-semibold" style={{ color: mut }}>
                Thinking…
              </div>
            ) : null}
          </div>

          {!busy && msgs.length < 4 ? (
            <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
              {chipPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void send(p)}
                  className="rounded-full px-2 py-1 text-[10px] font-semibold"
                  style={{
                    border: `1px solid ${line}`,
                    color: ink,
                    background: `color-mix(in srgb, ${accent} 6%, ${panel})`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="flex gap-1.5 px-2.5 pb-2.5 pt-1"
            style={{ borderTop: `1px solid ${line}` }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about events…"
              maxLength={500}
              className="min-w-0 flex-1 px-2.5 py-1.5 text-[12px] outline-none"
              style={{
                borderRadius: r,
                border: `1px solid ${line}`,
                background: panel,
                color: ink,
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="shrink-0 px-2.5 py-1.5 text-[11px] font-extrabold disabled:opacity-50"
              style={{
                borderRadius: r,
                background: accent,
                color: onAccent,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
