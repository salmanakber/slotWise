"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@/components/brand/loader";
import { BookingCalendar } from "@/components/widget/booking-calendar";
import { CalendarChat } from "@/components/widget/calendar-chat";
import { PartnerAppsPanel, PartnerReadyLink } from "@/components/widget/partner-apps";
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
    calendarStyle?: "MONTH" | "WEEK" | "HORIZONTAL" | string;
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
  payment: { mode: string; depositPercent: number; chargesEnabled?: boolean };
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
  calendarStyle?: "MONTH" | "WEEK" | "HORIZONTAL" | string;
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
    checkoutUrl?: string | null;
  } | null>(null);
  const [meetingBusy, setMeetingBusy] = useState<string | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [meetingSkipped, setMeetingSkipped] = useState(false);

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
  }, [serviceId, date, staffId, publicKey, site?.publicKey]);

  useEffect(() => {
    if (!embed || typeof window === "undefined") return;
    const el = rootRef.current;
    if (!el) return;

    const style =
      site?.branding?.calendarStyle === "WEEK"
        ? "WEEK"
        : site?.branding?.calendarStyle === "HORIZONTAL"
          ? "HORIZONTAL"
          : brandingPreview?.calendarStyle === "WEEK"
            ? "WEEK"
            : brandingPreview?.calendarStyle === "HORIZONTAL"
              ? "HORIZONTAL"
              : "MONTH";

    const post = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      window.parent.postMessage(
        {
          source: "slotwise",
          type: "resize",
          publicKey,
          height,
          calendarStyle: style,
          frameWidth: style === "HORIZONTAL" ? "70%" : null,
        },
        "*",
      );
    };

    window.parent.postMessage(
      { source: "slotwise", type: "ready", publicKey, calendarStyle: style },
      "*",
    );
    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    embed,
    publicKey,
    step,
    site,
    slots,
    loadingSlots,
    submitting,
    serviceId,
    brandingPreview?.calendarStyle,
  ]);

  useEffect(() => {
    if (!embed || typeof window === "undefined" || !error) return;
    // Do not send height:0 alone — host widget.js used to treat that as “destroy iframe”.
    window.parent.postMessage(
      { source: "slotwise", type: "unavailable", unavailable: true, publicKey, height: 0 },
      "*",
    );
  }, [embed, error, publicKey]);

  const service = useMemo(
    () => site?.services.find((s) => s.id === serviceId) ?? null,
    [site, serviceId],
  );

  // Merge live branding overrides at render time — never write them into site
  // state (that caused an infinite update loop + permanent loader in Branding preview).
  const branding = useMemo(() => {
    if (!site?.branding) return null;
    if (!brandingPreview) return site.branding;
    return {
      ...site.branding,
      ...brandingPreview,
      theme: brandingPreview.theme
        ? { ...site.branding.theme, ...brandingPreview.theme }
        : site.branding.theme,
    };
  }, [site?.branding, brandingPreview]);
  const accent = branding?.accent ?? "#f5a000";
  const onAccent = contrastOn(accent);
  const radius = branding?.radius ?? 18;
  const bg = branding?.theme?.bg ?? "#ffffff";
  const ink = branding?.inkColor || branding?.theme?.ink || "#0f1b2d";
  const line = branding?.theme?.line ?? "#e1e6ee";
  const panel = branding?.theme?.panel ?? bg;
  const mut = `color-mix(in srgb, ${ink} 58%, transparent)`;
  const business = branding?.businessName || site?.name || "Book";

  const payCents = useMemo(() => {
    if (!service || !site || service.priceCents <= 0) return 0;
    const mode = site.payment.mode || "FULL";
    if (mode === "PAY_ON_SITE") return 0;
    if (mode === "FULL") return service.priceCents;
    const pct = site.payment.depositPercent ?? 30;
    return Math.max(1, Math.round((service.priceCents * pct) / 100));
  }, [service, site]);

  const payLabel = useMemo(() => {
    if (!site || payCents <= 0) return null;
    return formatCustomerPrice(payCents, site.currency);
  }, [payCents, site]);

  function goToCheckout(url: string) {
    // Prefer _top so Webflow/iframe embeds leave the frame for Stripe Checkout
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_top";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      /* fall through */
    }
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch {
      /* cross-origin frame */
    }
    window.location.href = url;
  }

  async function confirm() {
    if (!service || !slotStart) return;
    setSubmitting(true);
    setError(null);
    let redirecting = false;
    const ctrl = new AbortController();
    const timeoutId = window.setTimeout(() => ctrl.abort(), 28_000);
    try {
      const res = await fetch(`/api/v1/sites/${publicKey}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          serviceId,
          startsAt: slotStart,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || undefined,
          staffId: staffId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Booking failed");

      const checkoutUrl =
        typeof data.checkoutUrl === "string" && data.checkoutUrl ? data.checkoutUrl : null;
      if (checkoutUrl) {
        redirecting = true;
        goToCheckout(checkoutUrl);
        // If the browser/iframe blocks navigation, surface a Pay button after a short wait
        window.setTimeout(() => {
          setSubmitting(false);
          setConfirmation({
            reference: data.reference,
            manageToken: data.manageToken,
            startsAt: data.startsAt,
            meetingUrl: null,
            meetingProvider: null,
            meetingTools: [],
            checkoutUrl,
          });
          setStep("done");
        }, 1600);
        return;
      }
      if (data.requiresPayment) {
        throw new Error(
          data.error || "Payment could not be started. Check Stripe is ready in Payments.",
        );
      }

      setMeetingSkipped(false);
      setMeetingError(null);
      setConfirmation({
        reference: data.reference,
        manageToken: data.manageToken,
        startsAt: data.startsAt,
        meetingUrl: data.meetingUrl ?? null,
        meetingProvider: data.meetingProvider ?? null,
        meetingTools: Array.isArray(data.meetingTools) ? data.meetingTools : [],
      });
      setStep("done");
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "Payment is taking too long. Please try again — if this keeps happening, finish Stripe setup under Payments."
          : e instanceof Error
            ? e.message
            : "Booking failed";
      setError(msg);
    } finally {
      window.clearTimeout(timeoutId);
      if (!redirecting) setSubmitting(false);
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

  const calendarStyle =
    branding?.calendarStyle === "WEEK"
      ? "WEEK"
      : branding?.calendarStyle === "HORIZONTAL"
        ? "HORIZONTAL"
        : "MONTH";
  const isHorizontal = calendarStyle === "HORIZONTAL";
  const calendarMode = calendarStyle === "WEEK" ? "WEEK" : "MONTH";
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
        maxWidth: isHorizontal
          ? "min(100%, 1280px)"
          : calendarStyle === "MONTH"
            ? "min(100%, 28rem)"
            : "min(100%, 28rem)",
        maxHeight: isHorizontal
          ? embed
            ? "min(92vh, 880px)"
            : "min(96vh, 920px)"
          : embed
            ? "min(92vh, 720px)"
            : "min(92vh, 820px)",
        marginTop: embed ? 20 : 0,
        marginInline: "auto",
        display: "flex",
        flexDirection: "column",
        containerType: "inline-size",
        boxShadow: embed
          ? "none"
          : `0 1px 2px color-mix(in srgb, ${ink} 6%, transparent), 0 22px 48px color-mix(in srgb, ${ink} 10%, transparent)`,
        fontFamily:
          branding?.font === "Match my site" || !branding?.font
            ? "inherit"
            : `${branding.font}, system-ui, sans-serif`,
      }}
      data-slotwise-root
      data-embed={embed ? "1" : undefined}
      data-layout={branding?.layout || "INLINE"}
      data-calendar={calendarStyle}
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
        .sw-w-times {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
          gap: 0.4rem;
        }
        .sw-w-when { display: grid; gap: 1rem; min-width: 0; }
        .sw-w-board { display: grid; gap: 1.25rem; min-width: 0; align-items: start; }
        .sw-w-board .sw-w-times { grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 0.5rem; }
        @container (min-width: 22rem) {
          .sw-w-times.is-compact { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @container (min-width: 28rem) {
          .sw-w-times.is-compact { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @container (min-width: 48rem) {
          .sw-w-board {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 0.95fr);
            gap: 1.35rem;
          }
          .sw-w-board > * { min-width: 0; }
          .sw-w-svc-list { max-height: min(52vh, 420px) !important; }
          .sw-w-board .sw-w-times { max-height: min(52vh, 420px) !important; }
        }
        @media (min-width: 960px) {
          .sw-widget[data-calendar="HORIZONTAL"] .sw-w-board {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 0.95fr);
            gap: 1.35rem;
          }
          .sw-widget[data-calendar="HORIZONTAL"] .sw-w-board > * { min-width: 0; }
          .sw-widget[data-calendar="HORIZONTAL"] .sw-w-svc-list { max-height: min(52vh, 420px) !important; }
          .sw-widget[data-calendar="HORIZONTAL"] .sw-w-board .sw-w-times { max-height: min(52vh, 420px) !important; }
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

      <div
        className={`relative grid min-h-0 min-w-0 flex-1 gap-3.5 overflow-x-hidden overflow-y-auto px-4 py-4 ${
          isHorizontal ? "sm:px-5 sm:py-5" : ""
        }`}
      >
        {(loadingSlots || submitting) && branding?.showLoader !== false ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[3px]"
            style={{ background: `color-mix(in srgb, ${panel} 82%, transparent)` }}
          >
            <BrandLoader
              style={branding?.loaderStyle ?? "PULSE"}
              accent={accent}
              label={
                submitting
                  ? payCents > 0
                    ? "Opening secure payment…"
                    : "Confirming booking…"
                  : "Finding open slots…"
              }
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

            {confirmation.checkoutUrl ? (
              <a
                href={confirmation.checkoutUrl}
                target="_top"
                rel="noopener noreferrer"
                className="mx-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-extrabold transition hover:brightness-105"
                style={{
                  background: accent,
                  color: onAccent,
                  borderRadius: Math.max(radius - 4, 10),
                }}
              >
                Continue to payment{payLabel ? ` · ${payLabel}` : ""}
              </a>
            ) : null}

            {confirmation.meetingUrl ? (
              <PartnerReadyLink
                href={confirmation.meetingUrl}
                provider={confirmation.meetingProvider}
                accent={accent}
                onAccent={onAccent}
                radius={radius}
              />
            ) : !meetingSkipped && confirmation.meetingTools.length > 0 ? (
              <PartnerAppsPanel
                tools={confirmation.meetingTools}
                busy={meetingBusy}
                error={meetingError}
                accent={accent}
                onAccent={onAccent}
                ink={ink}
                mut={mut}
                line={line}
                panel={panel}
                radius={radius}
                onPick={(toolId) => {
                  void (async () => {
                    setMeetingBusy(toolId);
                    setMeetingError(null);
                    try {
                      const res = await fetch(
                        `/api/v1/manage/${confirmation.manageToken}/meeting`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ provider: toolId }),
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
                onSkip={() => setMeetingSkipped(true)}
                onDone={() => setMeetingSkipped(true)}
              />
            ) : meetingSkipped ? (
              <p className="m-0 text-[12px] font-semibold" style={{ color: mut }}>
                No calendar or video added — you’re all set.
              </p>
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

        {step === "pick" && isHorizontal ? (
          <div className="sw-w-rise sw-w-board">
            <div className="grid min-w-0 gap-3.5">
              <section className="min-w-0">
                <div className="mb-2 flex min-w-0 items-end justify-between gap-2">
                  <h3 className="m-0 text-[15px] font-extrabold tracking-tight">Choose a service</h3>
                  <span className="shrink-0 text-[11px]" style={{ color: mut }}>
                    {site.services.length} available
                  </span>
                </div>
                <div className="sw-w-scroll sw-w-svc-list grid max-h-[220px] gap-2 overflow-y-auto pb-0.5">
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
                        className="group flex min-h-[48px] w-full min-w-0 items-center justify-between gap-2.5 border px-3.5 py-3 text-left transition"
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
                          <b className="block truncate text-[14px] font-extrabold tracking-tight">
                            {s.name}
                          </b>
                          <span className="mt-0.5 block truncate text-[12px]" style={{ color: mut }}>
                            {branding?.showDuration !== false ? `${s.durationMin} min` : ""}
                            {s.description ? ` · ${s.description}` : ""}
                          </span>
                        </span>
                        {priceLabel ? (
                          <em
                            className="shrink-0 not-italic text-[14px] font-extrabold"
                            style={{ color: accent }}
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
                  <h3 className="mb-2 text-[15px] font-extrabold tracking-tight">Who</h3>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    <Chip
                      active={!staffId}
                      accent={accent}
                      onAccent={onAccent}
                      line={line}
                      onClick={() => setStaffId("")}
                    >
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
            </div>

            <section className="min-w-0">
              <BookingCalendar
                mode="MONTH"
                look="wide"
                date={date}
                timezone={site.timezone}
                accent={accent}
                onAccent={onAccent}
                ink={ink}
                mut={mut}
                line={line}
                panel={panel}
                radius={radius}
                onChange={(iso) => {
                  setDate(iso);
                  setSlotStart("");
                }}
              />
            </section>

            <section className="min-w-0">
              <div className="mb-2">
                <h3 className="m-0 text-[15px] font-extrabold tracking-tight">Pick a time</h3>
                <p className="m-0 mt-0.5 text-[12px]" style={{ color: mut }}>
                  {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {slots.filter((s) => s.available).length
                    ? ` · ${slots.filter((s) => s.available).length} open`
                    : ""}
                </p>
              </div>
              <div className="sw-w-scroll sw-w-times max-h-[280px] w-full min-w-0 overflow-y-auto pb-0.5">
                {slots.length === 0 && !loadingSlots ? (
                  <div
                    className="rounded-xl border border-dashed px-3 py-5 text-center text-[12.5px]"
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
                        className="flex min-h-[42px] min-w-0 items-center justify-center border px-2 text-[13.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-35"
                        style={{
                          borderRadius: Math.max(radius - 6, 10),
                          borderColor: on ? accent : line,
                          background: on ? accent : "transparent",
                          color: on ? onAccent : ink,
                          fontWeight: on ? 800 : 650,
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="mb-0 mt-2.5 text-[12px]" style={{ color: mut }}>
                Times shown in {site.timezone}
              </p>
            </section>
          </div>
        ) : null}

        {step === "pick" && !isHorizontal ? (
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
                        <b className="block truncate text-[13px] font-extrabold tracking-tight">
                          {s.name}
                        </b>
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
                  <Chip
                    active={!staffId}
                    accent={accent}
                    onAccent={onAccent}
                    line={line}
                    onClick={() => setStaffId("")}
                  >
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
              <BookingCalendar
                mode={calendarMode}
                look="classic"
                date={date}
                timezone={site.timezone}
                accent={accent}
                onAccent={onAccent}
                ink={ink}
                mut={mut}
                line={line}
                panel={panel}
                radius={radius}
                onChange={(iso) => {
                  setDate(iso);
                  setSlotStart("");
                }}
              />
            </section>

            <section className="min-w-0">
              <div className="mb-2">
                <h3 className="m-0 text-[14px] font-extrabold tracking-tight">Select time</h3>
                <p className="m-0 mt-0.5 text-[11.5px]" style={{ color: mut }}>
                  {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {slots.filter((s) => s.available).length
                    ? ` · ${slots.filter((s) => s.available).length} open`
                    : ""}
                </p>
              </div>
              <div
                className={`sw-w-scroll sw-w-times max-h-[260px] w-full min-w-0 overflow-y-auto pb-0.5 ${
                  calendarStyle === "WEEK" ? "is-compact" : ""
                }`}
              >
                {slots.length === 0 && !loadingSlots ? (
                  <div
                    className="rounded-xl border border-dashed px-3 py-5 text-center text-[12.5px]"
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
                        className="flex min-h-[40px] min-w-0 flex-col items-center justify-center gap-0.5 border px-1.5 py-1.5 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-35"
                        style={{
                          borderRadius: Math.max(radius - 6, 10),
                          borderColor: on ? accent : line,
                          background: on ? accent : panel,
                          color: on ? onAccent : ink,
                          fontWeight: on ? 800 : 650,
                        }}
                      >
                        <TimeGlyph color={on ? onAccent : mut} size={12} />
                        {s.label}
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
                  ? site.payment.mode === "PAY_ON_SITE"
                    ? " · Pay on site"
                    : payLabel
                      ? site.payment.mode === "DEPOSIT"
                        ? ` · Pay ${payLabel} deposit now`
                        : ` · Pay ${payLabel} now`
                      : ""
                  : ""}
              </div>
              {payCents > 0 && site.payment.chargesEnabled === false ? (
                <p className="mb-0 mt-2 text-[12px] font-semibold" style={{ color: "#c0392b" }}>
                  Card payments aren’t ready yet. The business needs to finish Stripe setup.
                </p>
              ) : null}
            </div>
            <h3 className="text-[15px] font-extrabold tracking-tight">Your details</h3>
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              accent={accent}
              line={line}
              bg={bg}
              panel={panel}
              mut={mut}
              radius={radius}
              autoComplete="name"
              placeholder="Jane Smith"
              icon="user"
            />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              accent={accent}
              line={line}
              bg={bg}
              panel={panel}
              mut={mut}
              radius={radius}
              autoComplete="email"
              inputMode="email"
              placeholder="jane@company.com"
              hint="Confirmation and manage link go here"
              icon="email"
            />
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              type="tel"
              accent={accent}
              line={line}
              bg={bg}
              panel={panel}
              mut={mut}
              radius={radius}
              required={false}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+1 555 000 0000"
              hint="Optional · for SMS or WhatsApp if enabled"
              icon="phone"
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
            setMeetingSkipped(false);
            setMeetingError(null);
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
                disabled={
                  !name ||
                  !email ||
                  submitting ||
                  (payCents > 0 && site.payment.chargesEnabled === false)
                }
                onClick={confirm}
              >
                {payCents > 0 && site.payment.chargesEnabled === false
                  ? "Payments unavailable"
                  : payLabel
                    ? `Pay ${payLabel}`
                    : "Confirm booking"}
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

function TimeGlyph({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={color} strokeWidth="1.8" />
      <path d="M3 10h18" stroke={color} strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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

function FieldIcon({ kind }: { kind: "user" | "email" | "phone" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "email") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }
  if (kind === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
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
  panel,
  mut,
  radius,
  required = true,
  placeholder,
  hint,
  autoComplete,
  inputMode,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  accent: string;
  line: string;
  bg: string;
  panel: string;
  mut: string;
  radius: number;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  inputMode?: "email" | "tel" | "text";
  icon?: "user" | "email" | "phone";
}) {
  return (
    <label className="grid gap-1.5 text-[13px] font-bold">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {!required ? (
          <span className="text-[11px] font-semibold" style={{ color: mut }}>
            Optional
          </span>
        ) : null}
      </span>
      <span
        className="relative flex items-center border transition"
        style={{
          borderRadius: Math.max(radius - 8, 12),
          borderColor: line,
          background: panel,
        }}
      >
        {icon ? (
          <span className="pointer-events-none absolute left-3.5" style={{ color: mut }}>
            <FieldIcon kind={icon} />
          </span>
        ) : null}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className="w-full border-0 bg-transparent py-3 font-medium outline-none"
          style={{
            paddingLeft: icon ? 42 : 14,
            paddingRight: 14,
            color: "inherit",
            background: "transparent",
          }}
          onFocus={(e) => {
            const wrap = e.currentTarget.parentElement;
            if (wrap) {
              wrap.style.borderColor = accent;
              wrap.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${accent} 28%, transparent)`;
              wrap.style.background = bg;
            }
          }}
          onBlur={(e) => {
            const wrap = e.currentTarget.parentElement;
            if (wrap) {
              wrap.style.borderColor = line;
              wrap.style.boxShadow = "none";
              wrap.style.background = panel;
            }
          }}
        />
      </span>
      {hint ? (
        <span className="text-[11.5px] font-medium leading-snug" style={{ color: mut }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
