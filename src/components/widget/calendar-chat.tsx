"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatCustomerPrice } from "@/lib/utils";

type SuggestedSlot = {
  serviceId: string;
  serviceName: string;
  dateIso: string;
  start: string;
  end: string;
  label: string;
  priceCents?: number;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  events?: Array<{ id: string; name: string; durationMin: number; priceCents: number }>;
  slots?: SuggestedSlot[];
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
  /** Pre-fill calendar + jump to details */
  onPickSlot?: (slot: {
    serviceId: string;
    dateIso: string;
    start: string;
  }) => void;
  /** After a successful in-chat booking */
  onBooked?: (info: {
    reference: string;
    manageToken: string;
    startsAt: string;
    meetingUrl: string | null;
    meetingProvider: string | null;
  }) => void;
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
  "What’s available today?",
  "What’s available tomorrow?",
  "Show weekend openings",
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
  onPickSlot,
  onBooked,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [pendingSlot, setPendingSlot] = useState<SuggestedSlot | null>(null);
  const [bookName, setBookName] = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookError, setBookError] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! Ask about open times — e.g. “What’s free Friday?” or “Book Testing tomorrow”. I’ll list real slots you can tap to book.",
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
  }, [msgs, open, busy, pendingSlot]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pendingSlot) setPendingSlot(null);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pendingSlot]);

  const r = Math.max(radius - 4, 12);
  const soft = `color-mix(in srgb, ${ink} 4.5%, ${panel})`;

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput("");
    setPendingSlot(null);
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
          slots: data.suggestedSlots || [],
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

  function chooseSlot(slot: SuggestedSlot) {
    setPendingSlot(slot);
    setBookError(null);
    onPickEvent?.(slot.serviceId);
  }

  async function confirmChatBooking(e: FormEvent) {
    e.preventDefault();
    if (!pendingSlot || busy) return;
    if (!bookName.trim() || !bookEmail.trim()) {
      setBookError("Name and email are required");
      return;
    }
    setBusy(true);
    setBookError(null);
    try {
      const res = await fetch(`/api/v1/sites/${publicKey}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          visitorKey: visitorKey(),
          source,
          book: {
            serviceId: pendingSlot.serviceId,
            startsAt: pendingSlot.start,
            customerName: bookName.trim(),
            customerEmail: bookEmail.trim(),
            customerPhone: bookPhone.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      if (typeof data.checkoutUrl === "string" && data.checkoutUrl) {
        const target = typeof window !== "undefined" ? window.top || window : window;
        try {
          target.location.assign(data.checkoutUrl);
        } catch {
          window.location.assign(data.checkoutUrl);
        }
        return;
      }
      if (data.requiresPayment) {
        throw new Error("Payment could not be started. Please try again.");
      }
      setMsgs((m) => [
        ...m,
        {
          id: `b_${Date.now()}`,
          role: "assistant",
          content:
            data.reply ||
            `Booked ${pendingSlot.serviceName} at ${pendingSlot.label}. Reference ${data.reference || ""}.`,
        },
      ]);
      setPendingSlot(null);
      setBookName("");
      setBookEmail("");
      setBookPhone("");
      if (data.reference && data.manageToken) {
        onBooked?.({
          reference: data.reference,
          manageToken: data.manageToken,
          startsAt: data.startsAt || pendingSlot.start,
          meetingUrl: data.meetingUrl ?? null,
          meetingProvider: data.meetingProvider ?? null,
        });
        setOpen(false);
      }
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Booking failed");
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
        .sw-chat-bubble { max-width: 92%; white-space: pre-wrap; word-break: break-word; }
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

      <div
        className="sw-chat-dock flex shrink-0 justify-end px-3 pb-1.5 pt-1"
        style={{ background: panel }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="sw-chat-fab inline-flex max-w-[12rem] items-center gap-2 px-2.5 py-2 text-left"
          style={{
            borderRadius: 999,
            background: panel,
            color: ink,
            border: `1px solid ${line}`,
            boxShadow: `0 6px 18px color-mix(in srgb, ${ink} 12%, transparent)`,
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center text-[13px] font-black"
            style={{
              borderRadius: "50%",
              background: `linear-gradient(145deg, ${accent}, color-mix(in srgb, ${accent} 55%, ${ink}))`,
              color: onAccent,
            }}
            aria-hidden
          >
            ✦
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[12.5px] font-extrabold tracking-tight">Ask Chat</span>
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
      </div>

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
            className="sw-chat-sheet relative z-[1] flex max-h-[min(88vh,560px)] w-full max-w-[26rem] flex-col overflow-hidden"
            style={{
              borderRadius: Math.max(radius - 2, 14),
              background: panel,
              color: ink,
              border: `1px solid ${line}`,
              boxShadow: `0 24px 60px color-mix(in srgb, ${ink} 28%, transparent)`,
            }}
          >
            <header
              className="flex shrink-0 items-center justify-between gap-2 px-3.5 py-3"
              style={{ borderBottom: `1px solid ${line}` }}
            >
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-extrabold tracking-tight">
                  Calendar chat
                </div>
                <div className="truncate text-[11px]" style={{ color: mut }}>
                  Real openings · book from here
                </div>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center text-[18px] font-bold"
                style={{ color: mut }}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
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
                    {m.slots && m.slots.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.slots.map((slot) => (
                          <button
                            key={`${slot.serviceId}-${slot.start}`}
                            type="button"
                            onClick={() => chooseSlot(slot)}
                            className="rounded-xl px-2.5 py-1.5 text-left text-[11.5px] font-bold transition hover:brightness-[0.98]"
                            style={{
                              background: soft,
                              border: `1px solid ${line}`,
                              color: ink,
                            }}
                          >
                            {slot.label}
                            <span className="mt-0.5 block font-medium" style={{ color: mut }}>
                              {slot.serviceName} · {slot.dateIso.slice(5)} · Book
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {m.events && m.events.length > 0 && !(m.slots && m.slots.length) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.events.map((ev) => {
                          const price = formatCustomerPrice(ev.priceCents, currency);
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => {
                                onPickEvent?.(ev.id);
                                void send(`What times are open for ${ev.name} today and tomorrow?`);
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
                                {ev.durationMin} min{price ? ` · ${price}` : ""} · See times
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
                  Checking the calendar…
                </div>
              ) : null}
            </div>

            {pendingSlot ? (
              <form
                onSubmit={confirmChatBooking}
                className="shrink-0 space-y-2 border-t px-3.5 py-3"
                style={{ borderColor: line, background: panel }}
              >
                <div className="text-[12px] font-extrabold">
                  Book {pendingSlot.serviceName} · {pendingSlot.label}
                </div>
                <p className="m-0 text-[11px]" style={{ color: mut }}>
                  {pendingSlot.dateIso} — enter your details to confirm
                </p>
                <input
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full px-3 py-2 text-[13px] outline-none"
                  style={{ borderRadius: r, border: `1px solid ${line}`, background: soft, color: ink }}
                />
                <input
                  type="email"
                  value={bookEmail}
                  onChange={(e) => setBookEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full px-3 py-2 text-[13px] outline-none"
                  style={{ borderRadius: r, border: `1px solid ${line}`, background: soft, color: ink }}
                />
                <input
                  value={bookPhone}
                  onChange={(e) => setBookPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full px-3 py-2 text-[13px] outline-none"
                  style={{ borderRadius: r, border: `1px solid ${line}`, background: soft, color: ink }}
                />
                {bookError ? (
                  <p className="m-0 text-[11.5px] font-semibold" style={{ color: "#c0392b" }}>
                    {bookError}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 text-[12.5px] font-bold"
                    style={{ borderRadius: r, border: `1px solid ${line}` }}
                    onClick={() => setPendingSlot(null)}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 px-3 py-2 text-[12.5px] font-extrabold disabled:opacity-45"
                    style={{ borderRadius: r, background: accent, color: onAccent }}
                  >
                    {pendingSlot.priceCents && pendingSlot.priceCents > 0
                      ? `Pay ${formatCustomerPrice(pendingSlot.priceCents, currency) || ""}`
                      : "Confirm booking"}
                  </button>
                </div>
                <button
                  type="button"
                  className="w-full text-center text-[11px] font-semibold underline"
                  style={{ color: mut }}
                  onClick={() => {
                    onPickSlot?.({
                      serviceId: pendingSlot.serviceId,
                      dateIso: pendingSlot.dateIso,
                      start: pendingSlot.start,
                    });
                    setOpen(false);
                  }}
                >
                  Or continue in the calendar form →
                </button>
              </form>
            ) : (
              <>
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
                    placeholder="Ask for a day or event…"
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
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
