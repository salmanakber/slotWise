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
        "Hi! Ask me about this calendar — weekends, free workshops, short sessions, or how to book. I’ll point you to the right event.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const r = Math.max(radius - 4, 12);
  const soft = `color-mix(in srgb, ${ink} 4.5%, ${panel})`;

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
    <>
      <style>{`
        @keyframes sw-chat-backdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sw-chat-sheet {
          from { opacity: 0; transform: translateY(18px) scale(.97); }
          to { opacity: 1; transform: none; }
        }
        .sw-chat-backdrop { animation: sw-chat-backdrop .22s ease both; }
        .sw-chat-sheet { animation: sw-chat-sheet .32s cubic-bezier(.2,.8,.2,1) both; }
        .sw-chat-bubble { max-width: 88%; white-space: pre-wrap; word-break: break-word; }
        .sw-chat-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
        .sw-chat-scroll::-webkit-scrollbar { width: 4px; }
        .sw-chat-scroll::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, currentColor 18%, transparent);
          border-radius: 99px;
        }
        .sw-chat-fab:hover { filter: brightness(1.03); transform: translateY(-1px); }
        .sw-chat-fab { transition: transform .18s ease, filter .18s ease, box-shadow .18s ease; }
        @media (prefers-reduced-motion: reduce) {
          .sw-chat-backdrop, .sw-chat-sheet, .sw-chat-fab { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* Compact launcher — doesn’t steal vertical space from the calendar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sw-chat-fab absolute bottom-[4.6rem] right-3 z-[20] flex items-center gap-2 px-3 py-2 text-left"
        style={{
          borderRadius: Math.max(radius, 999),
          background: panel,
          color: ink,
          border: `1px solid ${line}`,
          boxShadow: `0 10px 28px color-mix(in srgb, ${ink} 14%, transparent), 0 0 0 1px color-mix(in srgb, ${accent} 12%, transparent)`,
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center text-[12px] font-black"
          style={{
            borderRadius: "50%",
            background: `linear-gradient(145deg, ${accent}, color-mix(in srgb, ${accent} 55%, ${ink}))`,
            color: onAccent,
          }}
          aria-hidden
        >
          ✦
        </span>
        <span className="pr-0.5">
          <span className="flex items-center gap-1.5">
            <span className="text-[12px] font-extrabold tracking-tight">Ask AI</span>
            <em
              className="rounded px-1 py-px text-[8px] font-black uppercase tracking-[0.08em] not-italic"
              style={{
                background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                color: accent,
              }}
            >
              Beta
            </em>
          </span>
        </span>
      </button>

      {open ? (
        <div
          className="absolute inset-0 z-[40] flex items-end justify-center p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Ask the calendar"
        >
          <button
            type="button"
            className="sw-chat-backdrop absolute inset-0 border-0"
            style={{
              background: `color-mix(in srgb, ${ink} 42%, transparent)`,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />

          <div
            className="sw-chat-sheet relative z-[1] flex w-full max-w-[26rem] flex-col overflow-hidden"
            style={{
              maxHeight: "min(78%, 440px)",
              borderRadius: Math.max(radius, 16),
              background: panel,
              color: ink,
              border: `1px solid ${line}`,
              boxShadow: `0 24px 64px color-mix(in srgb, ${ink} 28%, transparent)`,
            }}
          >
            <header
              className="relative shrink-0 px-4 pb-3 pt-3.5"
              style={{
                borderBottom: `1px solid ${line}`,
                background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 18%, ${panel}), ${panel} 70%)`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center text-[15px] font-black"
                    style={{
                      borderRadius: r,
                      background: `linear-gradient(145deg, ${accent}, color-mix(in srgb, ${accent} 50%, ${ink}))`,
                      color: onAccent,
                      boxShadow: `0 10px 22px color-mix(in srgb, ${accent} 35%, transparent)`,
                    }}
                    aria-hidden
                  >
                    ✦
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="m-0 truncate text-[15px] font-extrabold tracking-tight">
                        Ask the calendar
                      </h2>
                      <em
                        className="rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] not-italic"
                        style={{
                          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                          color: accent,
                        }}
                      >
                        Beta
                      </em>
                    </div>
                    <p className="m-0 mt-0.5 text-[11.5px]" style={{ color: mut }}>
                      Instant answers from live events
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 shrink-0 place-items-center text-[16px] font-bold"
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${line}`,
                    background: soft,
                    color: mut,
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </header>

            <div
              ref={scroller}
              className="sw-chat-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3.5"
              style={{ background: soft }}
            >
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="sw-chat-bubble px-3 py-2 text-[12.5px] leading-relaxed"
                    style={{
                      borderRadius: r,
                      background: m.role === "user" ? accent : panel,
                      color: m.role === "user" ? onAccent : ink,
                      border: m.role === "user" ? "none" : `1px solid ${line}`,
                      boxShadow:
                        m.role === "user"
                          ? `0 8px 18px color-mix(in srgb, ${accent} 28%, transparent)`
                          : `0 1px 2px color-mix(in srgb, ${ink} 6%, transparent)`,
                    }}
                  >
                    {m.content}
                    {m.events && m.events.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
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
                              className="rounded-xl px-2.5 py-1.5 text-left text-[11.5px] font-bold transition hover:brightness-[0.98]"
                              style={{
                                background: soft,
                                border: `1px solid ${line}`,
                                color: ink,
                              }}
                            >
                              {ev.name}
                              <span className="mt-0.5 block font-medium" style={{ color: mut }}>
                                {ev.durationMin} min{price ? ` · ${price}` : ""} · Book
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
                <div className="flex items-center gap-2 px-1 text-[11.5px] font-semibold" style={{ color: mut }}>
                  <span
                    className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: accent }}
                  />
                  Thinking…
                </div>
              ) : null}
            </div>

            {!busy ? (
              <div className="flex flex-wrap gap-1.5 px-3.5 pb-2 pt-0.5" style={{ background: soft }}>
                {chipPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => void send(p)}
                    className="rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold"
                    style={{
                      border: `1px solid ${line}`,
                      color: ink,
                      background: panel,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="flex shrink-0 gap-2 px-3.5 pb-3.5 pt-2"
              style={{
                borderTop: `1px solid ${line}`,
                background: panel,
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about events…"
                maxLength={500}
                className="min-w-0 flex-1 px-3 py-2.5 text-[13px] outline-none"
                style={{
                  borderRadius: r,
                  border: `1px solid ${line}`,
                  background: soft,
                  color: ink,
                }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="shrink-0 px-3.5 py-2.5 text-[12.5px] font-extrabold disabled:opacity-45"
                style={{
                  borderRadius: r,
                  background: accent,
                  color: onAccent,
                  boxShadow: `0 8px 18px color-mix(in srgb, ${accent} 30%, transparent)`,
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
