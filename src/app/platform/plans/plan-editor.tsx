"use client";

import { useState } from "react";

type PlanRow = {
  tier: string;
  name: string;
  priceMonthly: number;
  bookingsLimit: number | null;
  staffLimit: number | null;
  sitesLimit: number | null;
  themesLimit: number;
};

export function PlanEditor({ plan }: { plan: PlanRow }) {
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthly);
  const [bookingsLimit, setBookingsLimit] = useState(plan.bookingsLimit ?? 0);
  const [staffLimit, setStaffLimit] = useState(plan.staffLimit ?? 0);
  const [sitesLimit, setSitesLimit] = useState(plan.sitesLimit ?? 0);
  const [themesLimit, setThemesLimit] = useState(plan.themesLimit);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setMsg("");
    try {
      const res = await fetch(`/api/platform/plans/${plan.tier}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceMonthly,
          bookingsLimit: bookingsLimit === 0 ? null : bookingsLimit,
          staffLimit: staffLimit === 0 ? null : staffLimit,
          sitesLimit: sitesLimit === 0 ? null : sitesLimit,
          themesLimit,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMsg("Saved");
    } catch {
      setMsg("Could not save — check DB");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="sw-card flex flex-col gap-2.5">
      <h2 className="m-0 text-[15px] font-extrabold">{plan.name}</h2>
      <label className="text-[13px]">
        Monthly price (cents)
        <input
          type="number"
          className="mt-1 w-full rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
          value={priceMonthly}
          onChange={(e) => setPriceMonthly(Number(e.target.value))}
        />
      </label>
      <label className="text-[13px]">
        Bookings / month (0 = unlimited)
        <input
          type="number"
          className="mt-1 w-full rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
          value={bookingsLimit}
          onChange={(e) => setBookingsLimit(Number(e.target.value))}
        />
      </label>
      <label className="text-[13px]">
        Staff (0 = unlimited)
        <input
          type="number"
          className="mt-1 w-full rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
          value={staffLimit}
          onChange={(e) => setStaffLimit(Number(e.target.value))}
        />
      </label>
      <label className="text-[13px]">
        Sites (0 = unlimited)
        <input
          type="number"
          className="mt-1 w-full rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
          value={sitesLimit}
          onChange={(e) => setSitesLimit(Number(e.target.value))}
        />
      </label>
      <label className="text-[13px]">
        Themes
        <input
          type="number"
          min={1}
          max={8}
          className="mt-1 w-full rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
          value={themesLimit}
          onChange={(e) => setThemesLimit(Number(e.target.value))}
        />
      </label>
      <button type="button" className="sw-btn sw-btn-primary" disabled={pending} onClick={save}>
        {pending ? "Saving…" : `Save ${plan.name}`}
      </button>
      {msg ? <span className="text-[12.5px] font-semibold text-[var(--at)]">{msg}</span> : null}
    </section>
  );
}
