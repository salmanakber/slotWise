"use client";

import { useEffect, useState } from "react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DayRow = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

const DEFAULT_DAYS: DayRow[] = DAY_NAMES.map((_, dayOfWeek) => ({
  dayOfWeek,
  enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: "09:00",
  endTime: dayOfWeek === 6 ? "13:00" : "17:00",
}));

export default function AvailabilityPage() {
  const [days, setDays] = useState<DayRow[]>(DEFAULT_DAYS);
  const [timezone, setTimezone] = useState("UTC");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/site/availability")
      .then(async (r) => r.json())
      .then((data) => {
        if (data.timezone) setTimezone(data.timezone);
        if (Array.isArray(data.days) && data.days.length) {
          const mapped = DEFAULT_DAYS.map((d) => {
            const found = data.days.find((x: DayRow) => x.dayOfWeek === d.dayOfWeek);
            return found
              ? {
                  dayOfWeek: found.dayOfWeek,
                  enabled: found.enabled,
                  startTime: found.startTime,
                  endTime: found.endTime,
                }
              : d;
          });
          setDays(mapped);
        }
      })
      .catch(() => undefined);
  }, []);

  function update(dayOfWeek: number, patch: Partial<DayRow>) {
    setDays((list) => list.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  async function save() {
    setPending(true);
    setMsg("");
    const res = await fetch("/api/site/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    setPending(false);
    setMsg(res.ok ? "Hours saved — widget availability updated" : "Could not save hours");
  }

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="m-0 text-[15px] font-extrabold">Weekly hours</h2>
            <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--mut)" }}>
              Site timezone: <b>{timezone}</b>
            </p>
          </div>
          <button type="button" className="sw-btn sw-btn-primary" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save hours"}
          </button>
        </div>
        {days.map((d) => (
          <div key={d.dayOfWeek} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={d.enabled}
                onClick={() => update(d.dayOfWeek, { enabled: !d.enabled })}
                className={`relative h-6 w-[42px] rounded-full ${d.enabled ? "bg-[var(--ac)]" : "bg-[var(--ln)]"}`}
              >
                <span
                  className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition ${
                    d.enabled ? "translate-x-[18px]" : ""
                  }`}
                />
              </button>
              <b>{DAY_NAMES[d.dayOfWeek]}</b>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                disabled={!d.enabled}
                value={d.startTime}
                onChange={(e) => update(d.dayOfWeek, { startTime: e.target.value })}
                className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2 py-1.5 disabled:opacity-40"
              />
              <span style={{ color: "var(--mut)" }}>to</span>
              <input
                type="time"
                disabled={!d.enabled}
                value={d.endTime}
                onChange={(e) => update(d.dayOfWeek, { endTime: e.target.value })}
                className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2 py-1.5 disabled:opacity-40"
              />
            </div>
          </div>
        ))}
        {msg ? <p className="mt-3 text-[13px] font-semibold text-[var(--at)]">{msg}</p> : null}
      </section>
    </div>
  );
}
