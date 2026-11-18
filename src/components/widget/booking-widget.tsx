"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@/components/brand/loader";
import { CalendarChat } from "@/components/widget/calendar-chat";
import { formatCustomerPrice } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
};

type Staff = { id: string; name: string };

type SitePayload = {
  publicKey: string;
  name: string;
  timezone: string;
  currency: string;
  calendarChatEnabled?: boolean;
  branding: {
    themeKey: string;
    accent: string;
    inkColor?: string | null;
    radius: number;
    font: string;
    layout: string;
    businessName: string | null;
    showStaff: boolean;
    showPrice: boolean;
    showDuration: boolean;
    showBadge: boolean;
    showLoader: boolean;
    loaderStyle: string;
    theme?: { bg: string; ink: string; line: string; panel: string };
  };
  services: Service[];
  staff: Staff[];
  payment: { mode: string; depositPercent: number };
};

type Slot = {
  start: string;
  end: string;
  label: string;
  available: boolean;
  reason?: string;
};

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function contrastOn(accent: string) {
  const hex = accent.replace("#", "");
  if (hex.length < 6) return "#1a1203";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#1a1203" : "#ffffff";
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export type BrandingPreview = {
  themeKey?: string;
  accent?: string;
  inkColor?: string | null;
  radius?: number;
  font?: string;
  layout?: string;
  businessName?: string | null;
  showStaff?: boolean;
  showPrice?: boolean;
  showDuration?: boolean;
  showBadge?: boolean;
  showLoader?: boolean;
  loaderStyle?: string;
  theme?: { bg: string; ink: string; line: string; panel: string };
};

export function BookingWidget({
  publicKey,
  initial,
  embed = false,
  brandingPreview,
}: {
  publicKey: string;
  initial?: SitePayload;
  embed?: boolean;
  /** Live unsaved branding overrides (dashboard Branding page preview). */
  brandingPreview?: BrandingPreview | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [site, setSite] = useState<SitePayload | null>(initial ?? null);
  const [serviceId, setServiceId] = useState(initial?.services[0]?.id ?? "");
  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotStart, setSlotStart] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<"pick" | "details" | "done">("pick");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    manageToken: string;
    startsAt: string;
    meetingUrl: string | null;
    meetingProvider: string | null;
    meetingTools: Array<{ id: string; label: string }>;
  } | null>(null);
  const [meetingBusy, setMeetingBusy] = useState<string | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  useEffect(() => {
    if (site) return;
    fetch(`/api/v1/sites/${publicKey}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Site unavailable");
        return r.json();
      })
      .then((data: SitePayload) => {
        setSite(data);
        setServiceId(data.services[0]?.id ?? "");
      })
      .catch((e) => setError(e.message));
  }, [publicKey, site]);

  useEffect(() => {
    if (!site || !brandingPreview) return;
    setSite((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        branding: {
          ...prev.branding,
          ...brandingPreview,
          theme: brandingPreview.theme
            ? { ...prev.branding.theme, ...brandingPreview.theme }
            : prev.branding.theme,
        },
      };
    });
  }, [brandingPreview, site]);

  useEffect(() => {
    if (!site || !serviceId || !date) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlotStart("");
    const qs = new URLSearchParams({ serviceId, date });
    if (staffId) qs.set("staffId", staffId);
    fetch(`/api/v1/sites/${publicKey}/slots?${qs}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load slots");
        return data;
      })
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [site, serviceId, date, staffId, publicKey]);

  useEffect(() => {
    if (!embed || typeof window === "undefined") return;
    const el = rootRef.current;
    if (!el) return;

    const post = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      window.parent.postMessage(
        { source: "slotwise", type: "resize", publicKey, height },
        "*",
      );
    };

    window.parent.postMessage({ source: "slotwise", type: "ready", publicKey }, "*");
    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [embed, publicKey, step, site, slots, loadingSlots, submitting, serviceId]);

  useEffect(() => {
    if (!embed || typeof window === "undefined" || !error) return;
    window.parent.postMessage(
      { source: "slotwise", type: "resize", publicKey, height: 0 },
      "*",
    );
  }, [embed, error, publicKey]);

  const service = useMemo(
    () => site?.services.find((s) => s.id === serviceId) ?? null,
    [site, serviceId],
  );

  const branding = site?.branding;
  const accent = branding?.accent ?? "#f5a000";
  const onAccent = contrastOn(accent);
  const radius = branding?.radius ?? 18;
  const bg = branding?.theme?.bg ?? "#ffffff";
  const ink = branding?.inkColor || branding?.theme?.ink || "#0f1b2d";
  const line = branding?.theme?.line ?? "#e1e6ee";
  const panel = branding?.theme?.panel ?? bg;
  const mut = `color-mix(in srgb, ${ink} 58%, transparent)`;
  const business = branding?.businessName || site?.name || "Book";

  async function confirm() {
    if (!service || !slotStart) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sites/${publicKey}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startsAt: slotStart,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || undefined,
          staffId: staffId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      if (typeof data.checkoutUrl === "string" && data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setConfirmation({
        reference: data.reference,
        manageToken: data.manageToken,
        startsAt: data.startsAt,
        meetingUrl: data.meetingUrl ?? null,
        meetingProvider: data.meetingProvider ?? null,
        meetingTools: Array.isArray(data.meetingTools) ? data.meetingTools : [],
      });
      setMeetingError(null);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!site) {
    if (embed && error) {
      return (
        <div ref={rootRef} className="h-0 w-full overflow-hidden p-0" aria-hidden>
          <span className="sr-only">Booking unavailable</span>
        </div>
      );
    }
    return (
      <div
        ref={rootRef}
        className="flex min-h-[360px] items-center justify-center p-8"
        style={{
          background: bg,
          color: ink,
          borderRadius: radius,
          border: embed ? `1px solid ${line}` : undefined,
        }}
      >
        {error ? (
          <p className="text-sm" style={{ color: "#c0392b" }}>
            {error}
          </p>
        ) : (
          <BrandLoader accent={accent} label="Loading booking…" />
        )}
      </div>
    );
  }

  const days = Array.from({ length: 14 }, (_, i) => addDaysIso(todayIso(), i));
  const steps = [
    { key: "pick", label: "Time" },
    { key: "details", label: "Details" },
    { key: "done", label: "Done" },
  ] as const;
  const stepIndex = steps.findIndex((s) => s.key === step);

  const isFloating = branding?.layout === "FLOATING" && !embed;

  const panelNode = (
    <div
      ref={rootRef}
      className="sw-widget relative mx-auto box-border w-full overflow-hidden"
      style={{
        background: panel,
        color: ink,
        border: `1px solid ${line}`,
        borderRadius: embed ? Math.min(radius, 18) : radius,
        width: "100%",
        maxWidth: "min(100%, 33rem)",
        maxHeight: embed ? "min(92vh, 640px)" : "min(92vh, 720px)",
        marginTop: embed ? 20 : 0,
        marginInline: "auto",
        display: "flex",
        flexDirection: "column",
        containerType: "inline-size",
        boxShadow: embed
          ? "none"
          : `0 1px 2px color-mix(in srgb, ${ink} 6%, transparent), 0 22px 48px color-mix(in srgb, ${ink} 10%, transparent)`,
        fontFamily:
          branding?.font === "Match my site"
            ? "inherit"
            : `${branding?.font ?? "Manrope"}, system-ui, sans-serif`,
      }}
      data-slotwise-root
      data-embed={embed ? "1" : undefined}
      data-layout={branding?.layout || "INLINE"}
    >
      <style>{`
        @keyframes sw-w-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes sw-w-check {
          0% { transform: scale(.6); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .sw-w-rise { animation: sw-w-in .35s cubic-bezier(.2,.8,.2,1) both; }
        .sw-w-check { animation: sw-w-check .55s cubic-bezier(.2,.8,.2,1) both; }
        .sw-w-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
        .sw-w-scroll::-webkit-scrollbar { height: 3px; width: 3px; }
        .sw-w-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, currentColor 22%, transparent); border-radius: 99px; }
        .sw-widget *, .sw-widget *::before, .sw-widget *::after { box-sizing: border-box; }
        .sw-w-times { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
        @container (min-width: 22rem) {
          .sw-w-times { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @container (min-width: 28rem) {
          .sw-w-times { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sw-w-rise, .sw-w-check { animation: none !important; }
        }
      `}</style>

      <header
        className="relative shrink-0 min-w-0 px-4 pb-3 pt-4"
        style={{
          borderBottom: `1px solid ${line}`,
          background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 14%, ${panel}), ${panel} 62%)`,
        }}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="grid h-8 w-8 shrink-0 place-items-center text-[11px] font-extrabold tracking-tight"
              style={{
                borderRadius: Math.max(radius - 8, 8),
                background: accent,
                color: onAccent,
              }}
            >
              {initials(business)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-extrabold tracking-tight">{business}</div>
              <div className="truncate text-[11px]" style={{ color: mut }}>
                {step === "done" ? "Booking confirmed" : "Pick a time"}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {steps.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <span
                  key={s.key}
                  title={s.label}
                  className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold"
                  style={{
                    background: active || done ? accent : "transparent",
                    color: active || done ? onAccent : mut,
                    border: `1px solid ${active || done ? accent : line}`,
                    opacity: done && !active ? 0.75 : 1,
                  }}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
        </div>
        <div
          className="mt-2.5 h-0.5 overflow-hidden rounded-full"
          style={{ background: `color-mix(in srgb, ${line} 80%, transparent)` }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((stepIndex + 1) / steps.length) * 100}%`,
              background: accent,
            }}
          />
        </div>
      </header>

      <div className="relative grid min-h-0 min-w-0 flex-1 gap-3.5 overflow-x-hidden overflow-y-auto px-4 py-4">
        {(loadingSlots || submitting) && branding?.showLoader !== false ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[3px]"
            style={{ background: `color-mix(in srgb, ${panel} 82%, transparent)` }}
          >
            <BrandLoader
              style={branding?.loaderStyle ?? "PULSE"}
              accent={accent}
              label={submitting ? "Confirming booking…" : "Finding open slots…"}
            />
          </div>
        ) : null}

        {step === "done" && confirmation ? (
          <div className="sw-w-rise grid min-w-0 gap-3.5 py-5 text-center">
            <div
              className="sw-w-check mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl font-black"
              style={{ background: accent, color: onAccent }}
            >
              ✓
            </div>
            <div>
              <div className="text-[22px] font-extrabold tracking-tight">You’re booked</div>
              <p className="mx-auto mt-1.5 max-w-[30ch] text-[13px] leading-relaxed" style={{ color: mut }}>
                {confirmation.reference}
                <br />
                {new Date(confirmation.startsAt).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {confirmation.meetingUrl ? (
              <a
                href={confirmation.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="mx-auto inline-flex items-center justify-center px-5 py-2.5 text-[13px] font-extrabold transition hover:brightness-105"
                style={{
                  background: accent,
                  color: onAccent,
                  borderRadius: Math.max(radius - 4, 10),
                }}
              >
                Join {confirmation.meetingProvider === "zoom" ? "Zoom" : "Meet"}
              </a>
            ) : confirmation.meetingTools.length > 0 ? (
              <div
                className="rounded-2xl border px-3.5 py-3 text-left"
                style={{
                  borderColor: line,
                  background: `color-mix(in srgb, ${accent} 8%, ${panel})`,
                }}
              >
                <div className="text-[13px] font-extrabold">Add a video call</div>
                <p className="m-0 mt-1 text-[11.5px] leading-snug" style={{ color: mut }}>
                  Optional — pick Zoom or Google Meet for this booking.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {confirmation.meetingTools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      disabled={Boolean(meetingBusy)}
                      onClick={() => {
                        void (async () => {
                          setMeetingBusy(tool.id);
                          setMeetingError(null);
                          try {
                            const res = await fetch(
                              `/api/v1/manage/${confirmation.manageToken}/meeting`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ provider: tool.id }),
                              },
                            );
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Could not create meeting");
                            setConfirmation((c) =>
                              c
                                ? {
                                    ...c,
                                    meetingUrl: data.meetingUrl,
                                    meetingProvider: data.meetingProvider,
                                    meetingTools: [],
                                  }
                                : c,
                            );
                          } catch (err) {
                            setMeetingError(
                              err instanceof Error ? err.message : "Could not create meeting",
                            );
                          } finally {
                            setMeetingBusy(null);
                          }
                        })();
                      }}
                      className="px-3 py-2 text-[12px] font-extrabold disabled:opacity-50"
                      style={{
                        borderRadius: Math.max(radius - 6, 10),
                        background: accent,
                        color: onAccent,
                      }}
                    >
                      {meetingBusy === tool.id ? "Creating…" : tool.label}
                    </button>
                  ))}
                </div>
                {meetingError ? (
                  <p className="mb-0 mt-2 text-[11.5px] font-semibold" style={{ color: "#c0392b" }}>
                    {meetingError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <a
              className="mx-auto inline-flex items-center justify-center border px-5 py-2.5 text-[13px] font-bold transition"
              href={`/manage/${confirmation.manageToken}`}
              style={{
                borderColor: line,
                borderRadius: Math.max(radius - 4, 10),
                color: ink,
              }}
            >
              Manage booking
            </a>
          </div>
        ) : null}

        {step === "pick" ? (
          <div className="sw-w-rise grid min-w-0 gap-2.5">
            <section className="min-w-0">
              <div className="mb-1.5 flex min-w-0 items-end justify-between gap-2">
                <h3 className="text-[13px] font-extrabold tracking-tight">Service</h3>
                <span className="shrink-0 text-[10px]" style={{ color: mut }}>
                  {site.services.length} available
                </span>
              </div>
              <div className="sw-w-scroll grid max-h-[132px] gap-1.5 overflow-y-auto pb-0.5">
                {site.services.map((s) => {
                  const on = s.id === serviceId;
                  const priceLabel =
                    branding?.showPrice !== false
                      ? formatCustomerPrice(s.priceCents, site.currency)
                      : null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      className="group flex min-h-[40px] w-full min-w-0 items-center justify-between gap-2 border px-2.5 py-2 text-left transition"
                      style={{
                        borderRadius: Math.max(radius - 6, 10),
                        borderColor: on ? accent : line,
                        background: on
                          ? `color-mix(in srgb, ${accent} 12%, ${panel})`
                          : "transparent",
                        boxShadow: on ? `0 0 0 1px ${accent}` : "none",
                      }}
                    >
                      <span className="min-w-0 flex-1 overflow-hidden">
                        <b className="block truncate text-[13px] font-extrabold tracking-tight">{s.name}</b>
                        <span className="mt-0.5 block truncate text-[11px]" style={{ color: mut }}>
                          {branding?.showDuration !== false ? `${s.durationMin} min` : ""}
                          {s.description ? ` · ${s.description}` : ""}
                        </span>
                      </span>
                      {priceLabel ? (
                        <em
                          className="shrink-0 rounded-full px-2 py-0.5 not-italic text-[12px] font-extrabold"
                          style={{
                            background: `color-mix(in srgb, ${accent} 14%, ${panel})`,
                            color: accent,
                          }}
                        >
                          {priceLabel}
                        </em>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {branding?.showStaff !== false && site.staff.length > 0 ? (
              <section className="min-w-0">
                <h3 className="mb-2 text-[14px] font-extrabold tracking-tight">Who</h3>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  <Chip active={!staffId} accent={accent} onAccent={onAccent} line={line} onClick={() => setStaffId("")}>
                    Anyone
                  </Chip>
                  {site.staff.map((s) => (
                    <Chip
                      key={s.id}
                      active={staffId === s.id}
                      accent={accent}
                      onAccent={onAccent}
                      line={line}
                      onClick={() => setStaffId(s.id)}
                    >
                      {s.name}
                    </Chip>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="min-w-0">
              <div className="mb-1.5 flex min-w-0 items-end justify-between gap-2">
                <h3 className="text-[13px] font-extrabold tracking-tight">Day</h3>
                <span className="max-w-[40%] truncate text-[10px]" style={{ color: mut }}>
                  {site.timezone}
                </span>
              </div>
              <div className="sw-w-scroll w-full min-w-0 max-w-full overflow-x-auto pb-1">
                <div className="flex w-max gap-1 pr-1">
                  {days.map((d) => {
                    const dt = new Date(`${d}T12:00:00Z`);
                    const weekday = dt.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = dt.toLocaleDateString("en-US", { day: "numeric" });
                    const on = d === date;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDate(d)}
                        className="flex h-[52px] w-[48px] shrink-0 flex-col items-center justify-center gap-0 border text-center transition"
                        style={{
                          borderRadius: Math.max(radius - 6, 10),
                          borderColor: on ? accent : line,
                          background: on ? accent : "transparent",
                          color: on ? onAccent : ink,
                        }}
                      >
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          style={{ opacity: on ? 0.9 : 0.55 }}
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <span className="text-[8.5px] font-bold uppercase leading-none tracking-wide opacity-80">
                          {weekday}
                        </span>
                        <span className="text-[12.5px] font-extrabold leading-none">{dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="min-w-0">
              <h3 className="mb-1.5 text-[13px] font-extrabold tracking-tight">Time</h3>
              <div className="sw-w-scroll sw-w-times max-h-[148px] w-full min-w-0 overflow-y-auto pb-0.5">
                {slots.length === 0 && !loadingSlots ? (
                  <div
                    className="rounded-lg border border-dashed px-3 py-4 text-center text-[12px]"
                    style={{
                      borderColor: line,
                      color: mut,
                      gridColumn: "1 / -1",
                    }}
                  >
                    No openings this day. Try another date.
                  </div>
                ) : (
                  slots.map((s) => {
                    const on = slotStart === s.start;
                    return (
                      <button
                        key={s.start}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setSlotStart(s.start)}
                        className="flex min-h-[36px] min-w-0 flex-col items-center justify-center gap-0.5 border px-1 py-1.5 text-[11.5px] font-bold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-35"
                        style={{
                          borderRadius: Math.max(radius - 8, 8),
                          borderColor: on ? accent : line,
                          background: on ? accent : "transparent",
                          color: on ? onAccent : ink,
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          style={{ opacity: on ? 0.95 : 0.7 }}
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <span>{s.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        ) : null}

        {step === "details" ? (
          <section className="sw-w-rise grid gap-4">
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: line,
                background: `color-mix(in srgb, ${accent} 8%, ${panel})`,
              }}
            >
              <div className="font-extrabold">{service?.name}</div>
              <div className="mt-1" style={{ color: mut }}>
                {slotStart
                  ? new Date(slotStart).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""}
                {service && service.priceCents > 0
                  ? site.payment.mode === "DEPOSIT"
                    ? ` · ${site.payment.depositPercent}% deposit`
                    : site.payment.mode === "FULL"
                      ? " · Pay in full"
                      : " · Pay on site"
                  : ""}
              </div>
            </div>
            <h3 className="text-[15px] font-extrabold tracking-tight">Your details</h3>
            <Field label="Name" value={name} onChange={setName} accent={accent} line={line} bg={bg} radius={radius} />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              accent={accent}
              line={line}
              bg={bg}
              radius={radius}
            />
            <Field
              label="Phone (optional)"
              value={phone}
              onChange={setPhone}
              type="tel"
              accent={accent}
              line={line}
              bg={bg}
              radius={radius}
              required={false}
            />
          </section>
        ) : null}

        {error ? (
          <p
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: "rgba(192,57,43,.1)", color: "#c0392b" }}
          >
            {error}
          </p>
        ) : null}
      </div>

      {step === "pick" ? (
        <CalendarChat
          publicKey={publicKey}
          currency={site.currency}
          accent={accent}
          onAccent={onAccent}
          ink={ink}
          line={line}
          panel={panel}
          mut={mut}
          radius={radius}
          enabled={site.calendarChatEnabled !== false}
          source={embed ? "widget" : "book_page"}
          onPickEvent={(id) => setServiceId(id)}
          onPickSlot={({ serviceId: sid, dateIso, start }) => {
            setServiceId(sid);
            setDate(dateIso);
            setSlotStart(start);
            setStep("details");
          }}
          onBooked={(info) => {
            setConfirmation({
              reference: info.reference,
              manageToken: info.manageToken,
              startsAt: info.startsAt,
              meetingUrl: info.meetingUrl,
              meetingProvider: info.meetingProvider,
              meetingTools: [],
            });
            setStep("done");
          }}
        />
      ) : null}

      {step !== "done" ? (
        <footer
          className="sticky bottom-0 z-[5] flex shrink-0 min-w-0 items-center justify-between gap-2 border-t px-4 py-3.5 backdrop-blur-md"
          style={{
            borderColor: line,
            background: `color-mix(in srgb, ${panel} 94%, transparent)`,
          }}
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            <b className="block truncate text-[12.5px] font-extrabold">{service?.name}</b>
            <span className="block truncate text-[11px]" style={{ color: mut }}>
              {slotStart
                ? new Date(slotStart).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Select a time"}
              {branding?.showPrice !== false && service
                ? (() => {
                    const p = formatCustomerPrice(service.priceCents, site.currency);
                    return p ? ` · ${p}` : "";
                  })()
                : ""}
            </span>
          </div>
          {step === "pick" ? (
            <button
              type="button"
              className="shrink-0 px-3.5 py-2 text-[12.5px] font-extrabold transition hover:brightness-105 disabled:opacity-40"
              style={{
                background: accent,
                color: onAccent,
                borderRadius: Math.max(radius - 4, 10),
                boxShadow: slotStart
                  ? `0 8px 18px color-mix(in srgb, ${accent} 28%, transparent)`
                  : "none",
              }}
              disabled={!slotStart}
              onClick={() => setStep("details")}
            >
              Continue
            </button>
          ) : (
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                className="border px-2.5 py-2 text-[12.5px] font-bold"
                style={{ borderColor: line, borderRadius: Math.max(radius - 4, 10) }}
                onClick={() => setStep("pick")}
              >
                Back
              </button>
              <button
                type="button"
                className="px-3.5 py-2 text-[12.5px] font-extrabold transition hover:brightness-105 disabled:opacity-40"
                style={{
                  background: accent,
                  color: onAccent,
                  borderRadius: Math.max(radius - 4, 10),
                  boxShadow: `0 8px 18px color-mix(in srgb, ${accent} 28%, transparent)`,
                }}
                disabled={!name || !email || submitting}
                onClick={confirm}
              >
                Confirm
              </button>
            </div>
          )}
        </footer>
      ) : null}

      {branding?.showBadge !== false ? (
        <div
          className="flex shrink-0 items-center justify-center gap-1.5 pb-2.5 pt-1 text-[10px] font-semibold tracking-wide"
          style={{ color: mut }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 rounded-[3px] object-contain"
          />
          <span>Powered by Slotwise</span>
        </div>
      ) : null}
    </div>
  );

  if (!isFloating) return panelNode;

  return (
    <div className="relative min-h-[120px] w-full">
      {floatingOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <button
            type="button"
            aria-label="Close booking"
            className="absolute inset-0 cursor-default"
            onClick={() => setFloatingOpen(false)}
          />
          <div className="relative z-[1] w-full max-w-[32rem]">{panelNode}</div>
        </div>
      ) : null}
      <button
        type="button"
        className="fixed bottom-5 right-5 z-[70] rounded-full px-5 py-3.5 text-[14px] font-extrabold shadow-lg"
        style={{ background: accent, color: onAccent }}
        onClick={() => setFloatingOpen(true)}
      >
        Book now
      </button>
    </div>
  );
}

function Chip({
  children,
  active,
  accent,
  onAccent,
  line,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  accent: string;
  onAccent: string;
  line: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition"
      style={{
        borderColor: active ? accent : line,
        background: active ? accent : "transparent",
        color: active ? onAccent : "inherit",
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  accent,
  line,
  bg,
  radius,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  accent: string;
  line: string;
  bg: string;
  radius: number;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-[13px] font-bold">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="border px-3.5 py-2.5 font-medium outline-none transition"
        style={{
          borderRadius: Math.max(radius - 8, 10),
          borderColor: line,
          background: bg,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = accent;
          e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${accent} 28%, transparent)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = line;
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </label>
  );
}
