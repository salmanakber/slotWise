"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@/components/brand/loader";
import { formatMoney } from "@/lib/utils";

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
  branding: {
    themeKey: string;
    accent: string;
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

export function BookingWidget({
  publicKey,
  initial,
  embed = false,
}: {
  publicKey: string;
  initial?: SitePayload;
  embed?: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    manageToken: string;
    startsAt: string;
  } | null>(null);

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
  }, [embed, publicKey, step, site, slots, loadingSlots, submitting]);

  const service = useMemo(
    () => site?.services.find((s) => s.id === serviceId) ?? null,
    [site, serviceId],
  );

  const branding = site?.branding;
  const accent = branding?.accent ?? "#f5a000";
  const onAccent = contrastOn(accent);
  const radius = branding?.radius ?? 18;
  const bg = branding?.theme?.bg ?? "#ffffff";
  const ink = branding?.theme?.ink ?? "#0f1b2d";
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
      setConfirmation({
        reference: data.reference,
        manageToken: data.manageToken,
        startsAt: data.startsAt,
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!site) {
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

  return (
    <div
      ref={rootRef}
      className="sw-widget mx-auto w-full max-w-[400px] overflow-visible"
      style={{
        background: panel,
        color: ink,
        border: `1px solid ${line}`,
        borderRadius: radius,
        maxHeight: "none",
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
    >
      <style>{`
        @keyframes sw-w-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes sw-w-check {
          0% { transform: scale(.6); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .sw-w-rise { animation: sw-w-in .45s cubic-bezier(.2,.8,.2,1) both; }
        .sw-w-check { animation: sw-w-check .55s cubic-bezier(.2,.8,.2,1) both; }
        .sw-w-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
        .sw-w-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, currentColor 22%, transparent); border-radius: 99px; }
        @media (prefers-reduced-motion: reduce) {
          .sw-w-rise, .sw-w-check { animation: none !important; }
        }
      `}</style>

      <header
        className="relative px-4 pb-3.5 pt-4 sm:px-5"
        style={{
          borderBottom: `1px solid ${line}`,
          background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 14%, ${panel}), ${panel} 62%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center text-sm font-extrabold tracking-tight"
              style={{
                borderRadius: Math.max(radius - 8, 10),
                background: accent,
                color: onAccent,
                boxShadow: `0 10px 24px color-mix(in srgb, ${accent} 35%, transparent)`,
              }}
            >
              {initials(business)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[17px] font-extrabold tracking-tight">{business}</div>
              <div className="mt-0.5 text-[12.5px]" style={{ color: mut }}>
                {step === "done" ? "Booking confirmed" : "Pick a service & time"}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {steps.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <span
                  key={s.key}
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: active || done ? accent : "transparent",
                    color: active || done ? onAccent : mut,
                    border: `1px solid ${active || done ? accent : line}`,
                    opacity: done && !active ? 0.75 : 1,
                  }}
                >
                  {i + 1}
                  <span className="hidden sm:inline"> · {s.label}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div
          className="mt-4 h-1 overflow-hidden rounded-full"
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

      <div className="relative grid gap-4 p-4 sm:gap-5 sm:p-5" style={{ maxHeight: "none", overflow: "visible" }}>
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
          <div className="sw-w-rise grid gap-4 py-8 text-center">
            <div
              className="sw-w-check mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-black"
              style={{ background: accent, color: onAccent }}
            >
              ✓
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">You’re booked</div>
              <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed" style={{ color: mut }}>
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
            <a
              className="mx-auto inline-flex items-center justify-center px-6 py-3 text-sm font-extrabold transition hover:brightness-105"
              href={`/manage/${confirmation.manageToken}`}
              style={{
                background: accent,
                color: onAccent,
                borderRadius: Math.max(radius - 4, 10),
              }}
            >
              Manage booking
            </a>
          </div>
        ) : null}

        {step === "pick" ? (
          <div className="sw-w-rise grid gap-5">
            <section>
              <div className="mb-2.5 flex items-end justify-between gap-2">
                <h3 className="text-[15px] font-extrabold tracking-tight">Service</h3>
                <span className="text-[12px]" style={{ color: mut }}>
                  {site.services.length} available
                </span>
              </div>
              <div className="sw-w-scroll grid max-h-[220px] gap-2 overflow-y-auto px-0.5 pb-1">
                {site.services.map((s) => {
                  const on = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      className="group flex min-h-[52px] w-full items-center justify-between gap-3 border p-3.5 text-left transition"
                      style={{
                        borderRadius: Math.max(radius - 6, 10),
                        borderColor: on ? accent : line,
                        background: on
                          ? `color-mix(in srgb, ${accent} 12%, ${panel})`
                          : "transparent",
                        boxShadow: on
                          ? `0 0 0 1px ${accent}, 0 10px 24px color-mix(in srgb, ${accent} 18%, transparent)`
                          : "none",
                      }}
                    >
                      <span className="min-w-0">
                        <b className="block text-[14.5px] font-extrabold tracking-tight">{s.name}</b>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]" style={{ color: mut }}>
                          {branding?.showDuration !== false ? <span>{s.durationMin} min</span> : null}
                          {s.description ? <span>· {s.description}</span> : null}
                        </span>
                      </span>
                      {branding?.showPrice !== false ? (
                        <em className="shrink-0 not-italic text-[15px] font-extrabold">
                          {formatMoney(s.priceCents, site.currency)}
                        </em>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {branding?.showStaff !== false && site.staff.length > 0 ? (
              <section>
                <h3 className="mb-2.5 text-[15px] font-extrabold tracking-tight">Who</h3>
                <div className="flex flex-wrap gap-2">
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

            <section>
              <div className="mb-2.5 flex items-end justify-between gap-2">
                <h3 className="text-[15px] font-extrabold tracking-tight">Day</h3>
                <span className="text-[12px]" style={{ color: mut }}>
                  {site.timezone}
                </span>
              </div>
              <div className="sw-w-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-0.5">
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
                      className="grid min-h-[52px] min-w-[64px] shrink-0 gap-0.5 border px-2 py-2.5 text-center transition"
                      style={{
                        borderRadius: Math.max(radius - 6, 10),
                        borderColor: on ? accent : line,
                        background: on ? accent : "transparent",
                        color: on ? onAccent : ink,
                      }}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">
                        {weekday}
                      </span>
                      <span className="text-[17px] font-extrabold leading-none">{dayNum}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2.5 text-[15px] font-extrabold tracking-tight">Time</h3>
              <div
                className="sw-w-scroll grid max-h-[240px] grid-cols-2 gap-2 overflow-y-auto px-0.5 pb-2 sm:grid-cols-3"
                style={{ scrollbarGutter: "stable" }}
              >
                {slots.length === 0 && !loadingSlots ? (
                  <div
                    className="col-span-full rounded-2xl border border-dashed px-4 py-8 text-center text-sm"
                    style={{ borderColor: line, color: mut }}
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
                        className="min-h-[44px] border px-2 py-2.5 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-35"
                        style={{
                          borderRadius: Math.max(radius - 6, 10),
                          borderColor: on ? accent : line,
                          background: on ? accent : "transparent",
                          color: on ? onAccent : ink,
                        }}
                      >
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
                {" · "}
                {site.payment.mode === "DEPOSIT"
                  ? `${site.payment.depositPercent}% deposit`
                  : site.payment.mode === "FULL"
                    ? "Pay in full"
                    : "Pay on site"}
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

      {step !== "done" ? (
        <footer
          className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3.5 sm:px-5 sm:py-4 backdrop-blur-md"
          style={{
            borderColor: line,
            background: `color-mix(in srgb, ${panel} 92%, transparent)`,
          }}
        >
          <div className="min-w-0">
            <b className="block truncate text-[14.5px] font-extrabold">{service?.name}</b>
            <span className="text-[13px]" style={{ color: mut }}>
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
                ? ` · ${formatMoney(service.priceCents, site.currency)}`
                : ""}
            </span>
          </div>
          {step === "pick" ? (
            <button
              type="button"
              className="shrink-0 px-5 py-3 text-sm font-extrabold transition hover:brightness-105 disabled:opacity-40"
              style={{
                background: accent,
                color: onAccent,
                borderRadius: Math.max(radius - 4, 10),
                boxShadow: slotStart
                  ? `0 12px 28px color-mix(in srgb, ${accent} 35%, transparent)`
                  : "none",
              }}
              disabled={!slotStart}
              onClick={() => setStep("details")}
            >
              Continue
            </button>
          ) : (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="border px-4 py-3 text-sm font-bold"
                style={{ borderColor: line, borderRadius: Math.max(radius - 4, 10) }}
                onClick={() => setStep("pick")}
              >
                Back
              </button>
              <button
                type="button"
                className="px-5 py-3 text-sm font-extrabold transition hover:brightness-105 disabled:opacity-40"
                style={{
                  background: accent,
                  color: onAccent,
                  borderRadius: Math.max(radius - 4, 10),
                  boxShadow: `0 12px 28px color-mix(in srgb, ${accent} 35%, transparent)`,
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
        <div className="pb-3.5 text-center text-[11px] font-semibold tracking-wide" style={{ color: mut }}>
          Powered by Slotwise
        </div>
      ) : null}
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
