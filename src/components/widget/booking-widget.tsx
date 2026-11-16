"use client";

import { useEffect, useMemo, useState } from "react";
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

export function BookingWidget({
  publicKey,
  initial,
}: {
  publicKey: string;
  initial?: SitePayload;
}) {
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

  const service = useMemo(
    () => site?.services.find((s) => s.id === serviceId) ?? null,
    [site, serviceId],
  );

  const branding = site?.branding;
  const accent = branding?.accent ?? "#f5a000";
  const radius = branding?.radius ?? 14;
  const bg = branding?.theme?.bg ?? "#fff";
  const ink = branding?.theme?.ink ?? "#0f1b2d";
  const line = branding?.theme?.line ?? "#e1e6ee";

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
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[var(--ln)] bg-[var(--pn)] p-8">
        {error ? <p className="text-sm text-[var(--bad)]">{error}</p> : <BrandLoader accent="#f5a000" label="Loading Slotwise…" />}
      </div>
    );
  }

  const days = Array.from({ length: 14 }, (_, i) => addDaysIso(todayIso(), i));

  return (
    <div
      className="sw-widget mx-auto w-full max-w-[420px] overflow-hidden border shadow-[0_14px_34px_rgba(0,0,0,.12)]"
      style={{
        background: bg,
        color: ink,
        borderColor: line,
        borderRadius: radius,
        fontFamily: branding?.font === "Match my site" ? "inherit" : `${branding?.font ?? "Manrope"}, system-ui, sans-serif`,
      }}
      data-slotwise-root
    >
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: line }}>
        <div className="flex items-center gap-2 font-extrabold">
          <i className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: accent }} />
          {branding?.businessName || site.name}
        </div>
        <div className="text-[12px] opacity-70">
          {step === "pick" ? "1 · Time" : step === "details" ? "2 · Details" : "Done"}
        </div>
      </header>

      <div className="relative grid gap-5 p-5">
        {(loadingSlots || submitting) && branding?.showLoader !== false ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px]"
            style={{ background: `color-mix(in srgb, ${bg} 88%, transparent)` }}
          >
            <BrandLoader
              style={branding?.loaderStyle ?? "PULSE"}
              accent={accent}
              label={submitting ? "Confirming booking…" : "Finding open slots…"}
            />
          </div>
        ) : null}

        {step === "done" && confirmation ? (
          <div className="grid gap-3 py-6 text-center">
            <div className="text-2xl font-extrabold">You’re booked</div>
            <p className="text-sm opacity-75">
              {confirmation.reference} · {new Date(confirmation.startsAt).toLocaleString()}
            </p>
            <a className="sw-btn sw-btn-primary mx-auto" href={`/manage/${confirmation.manageToken}`}>
              Manage booking
            </a>
          </div>
        ) : null}

        {step === "pick" ? (
          <>
            <section>
              <h3 className="mb-2 text-[15px] font-extrabold">Choose a service</h3>
              <div className="grid gap-2">
                {site.services.map((s) => {
                  const on = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      className="flex w-full items-center justify-between gap-3 border p-3 text-left"
                      style={{
                        borderRadius: Math.max(radius - 6, 4),
                        borderColor: on ? accent : line,
                        background: on ? `color-mix(in srgb, ${accent} 14%, ${bg})` : "transparent",
                      }}
                    >
                      <span>
                        <b>{s.name}</b>
                        {branding?.showDuration !== false ? (
                          <small className="block text-[12.5px] opacity-70">{s.durationMin} min</small>
                        ) : null}
                        {s.description ? <small className="block text-[12.5px] opacity-70">{s.description}</small> : null}
                      </span>
                      {branding?.showPrice !== false ? <em className="not-italic font-extrabold">{formatMoney(s.priceCents, site.currency)}</em> : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {branding?.showStaff !== false && site.staff.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[15px] font-extrabold">Staff</h3>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!staffId} accent={accent} line={line} onClick={() => setStaffId("")}>
                    Anyone
                  </Chip>
                  {site.staff.map((s) => (
                    <Chip key={s.id} active={staffId === s.id} accent={accent} line={line} onClick={() => setStaffId(s.id)}>
                      {s.name}
                    </Chip>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 text-[15px] font-extrabold">Pick a day</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d) => {
                  const label = new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                  });
                  const on = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDate(d)}
                      className="min-w-[64px] shrink-0 border px-2 py-2 text-[13px] font-semibold"
                      style={{
                        borderRadius: Math.max(radius - 6, 4),
                        borderColor: on ? accent : line,
                        background: on ? accent : "transparent",
                        color: on ? "#1a1203" : ink,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12.5px] opacity-70">Times in {site.timezone}</p>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-extrabold">Pick a time</h3>
              <div className="grid grid-cols-3 gap-2">
                {slots.length === 0 && !loadingSlots ? (
                  <p className="col-span-3 text-sm opacity-70">No openings this day. Try another date.</p>
                ) : (
                  slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setSlotStart(s.start)}
                      className="border py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:line-through disabled:opacity-35"
                      style={{
                        borderRadius: Math.max(radius - 6, 4),
                        borderColor: slotStart === s.start ? accent : line,
                        background: slotStart === s.start ? accent : "transparent",
                        color: slotStart === s.start ? "#1a1203" : ink,
                      }}
                    >
                      {s.label}
                    </button>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}

        {step === "details" ? (
          <section className="grid gap-3">
            <h3 className="text-[15px] font-extrabold">Your details</h3>
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="Phone (optional)" value={phone} onChange={setPhone} />
            {service ? (
              <p className="text-sm opacity-75">
                {service.name} · {new Date(slotStart).toLocaleString()} ·{" "}
                {site.payment.mode === "DEPOSIT"
                  ? `${site.payment.depositPercent}% deposit`
                  : site.payment.mode === "FULL"
                    ? "Pay in full"
                    : "Pay on site"}
              </p>
            ) : null}
          </section>
        ) : null}

        {error ? <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p> : null}
      </div>

      {step !== "done" ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4" style={{ borderColor: line }}>
          <div>
            <b className="block">{service?.name}</b>
            <span className="text-[13.5px] opacity-70">
              {slotStart ? new Date(slotStart).toLocaleString() : "Select a time"}
            </span>
          </div>
          {step === "pick" ? (
            <button
              type="button"
              className="px-5 py-3 font-extrabold disabled:opacity-40"
              style={{ background: accent, color: "#1a1203", borderRadius: Math.max(radius - 4, 6) }}
              disabled={!slotStart}
              onClick={() => setStep("details")}
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" className="sw-btn" onClick={() => setStep("pick")}>
                Back
              </button>
              <button
                type="button"
                className="px-5 py-3 font-extrabold disabled:opacity-40"
                style={{ background: accent, color: "#1a1203", borderRadius: Math.max(radius - 4, 6) }}
                disabled={!name || !email || submitting}
                onClick={confirm}
              >
                Confirm booking
              </button>
            </div>
          )}
        </footer>
      ) : null}

      {branding?.showBadge !== false ? (
        <div className="pb-3 text-center text-[11.5px] opacity-60">Powered by Slotwise</div>
      ) : null}
    </div>
  );
}

function Chip({
  children,
  active,
  accent,
  line,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  accent: string;
  line: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
      style={{
        borderColor: active ? accent : line,
        background: active ? accent : "transparent",
        color: active ? "#1a1203" : "inherit",
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
        required={type !== "tel"}
      />
    </label>
  );
}
