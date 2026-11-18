"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DayRow = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type TimeOffRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

const DEFAULT_DAYS: DayRow[] = DAY_NAMES.map((_, dayOfWeek) => ({
  dayOfWeek,
  enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: "09:00",
  endTime: dayOfWeek === 6 ? "13:00" : "17:00",
}));

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fmtRange(startsAt: string, endsAt: string, timezone: string) {
  try {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    const day = s.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    });
    const st = s.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
    const et = e.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
    return `${day} · ${st} – ${et}`;
  } catch {
    return `${startsAt} → ${endsAt}`;
  }
}

export default function AvailabilityPage() {
  const [days, setDays] = useState<DayRow[]>(DEFAULT_DAYS);
  const [timeOff, setTimeOff] = useState<TimeOffRow[]>([]);
  const [timezone, setTimezone] = useState("UTC");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [blockPending, setBlockPending] = useState(false);
  const [block, setBlock] = useState({
    date: todayIso(),
    startTime: "12:00",
    endTime: "13:00",
    reason: "",
    allDay: false,
  });

  const load = useCallback(async () => {
    const [hoursRes, offRes] = await Promise.all([
      fetch("/api/site/availability", { cache: "no-store" }),
      fetch("/api/site/availability/time-off", { cache: "no-store" }),
    ]);
    const hours = await hoursRes.json();
    const off = await offRes.json();
    if (hours.timezone) setTimezone(hours.timezone);
    else if (off.timezone) setTimezone(off.timezone);
    if (Array.isArray(hours.days) && hours.days.length) {
      setDays(
        DEFAULT_DAYS.map((d) => {
          const found = hours.days.find((x: DayRow) => x.dayOfWeek === d.dayOfWeek);
          return found
            ? {
                dayOfWeek: found.dayOfWeek,
                enabled: found.enabled,
                startTime: found.startTime,
                endTime: found.endTime,
              }
            : d;
        }),
      );
    }
    if (Array.isArray(off.timeOff)) setTimeOff(off.timeOff);
    else if (Array.isArray(hours.timeOff)) setTimeOff(hours.timeOff);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function addBlock(e: FormEvent) {
    e.preventDefault();
    setBlockPending(true);
    setMsg("");
    const res = await fetch("/api/site/availability/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(block),
    });
    const json = await res.json();
    setBlockPending(false);
    if (!res.ok) {
      setMsg(json.error || "Could not block that range");
      return;
    }
    setTimeOff((list) => [...list, json.timeOff].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    setMsg("Slots blocked — customers can’t book that range");
    setBlock((b) => ({ ...b, reason: "" }));
  }

  async function removeBlock(id: string) {
    const res = await fetch(`/api/site/availability/time-off?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTimeOff((list) => list.filter((t) => t.id !== id));
      setMsg("Block removed — slots open again");
    } else {
      setMsg("Could not remove block");
    }
  }

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="m-0 text-[15px] font-extrabold">Weekly hours</h2>
            <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--mut)" }}>
              Site timezone: <b>{timezone}</b> · enable/disable each day and set open range
            </p>
          </div>
          <button type="button" className="sw-btn sw-btn-primary" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save hours"}
          </button>
        </div>
        {days.map((d) => (
          <div
            key={d.dayOfWeek}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3"
          >
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
      </section>

      <section className="sw-card">
        <div className="mb-1">
          <h2 className="m-0 text-[15px] font-extrabold">Block specific slots</h2>
          <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--mut)" }}>
            Disable a time range on a specific date (lunch, holiday afternoon, private hold, etc.)
          </p>
        </div>

        <form
          onSubmit={addBlock}
          className="mt-3 grid gap-3 rounded-xl border border-[var(--ln)] bg-[color-mix(in_srgb,var(--soft,var(--pn))_70%,transparent)] p-3.5 sm:grid-cols-2"
        >
          <label className="grid gap-1 text-[12.5px] font-bold">
            Date
            <input
              type="date"
              required
              value={block.date}
              onChange={(e) => setBlock((b) => ({ ...b, date: e.target.value }))}
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-medium"
            />
          </label>
          <label className="flex items-end gap-2 pb-1 text-[12.5px] font-bold">
            <input
              type="checkbox"
              checked={block.allDay}
              onChange={(e) => setBlock((b) => ({ ...b, allDay: e.target.checked }))}
              className="h-4 w-4 accent-[var(--ac)]"
            />
            Block entire day
          </label>
          <label className="grid gap-1 text-[12.5px] font-bold">
            From
            <input
              type="time"
              disabled={block.allDay}
              value={block.startTime}
              onChange={(e) => setBlock((b) => ({ ...b, startTime: e.target.value }))}
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-medium disabled:opacity-40"
            />
          </label>
          <label className="grid gap-1 text-[12.5px] font-bold">
            To
            <input
              type="time"
              disabled={block.allDay}
              value={block.endTime}
              onChange={(e) => setBlock((b) => ({ ...b, endTime: e.target.value }))}
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-medium disabled:opacity-40"
            />
          </label>
          <label className="grid gap-1 text-[12.5px] font-bold sm:col-span-2">
            Reason (optional)
            <input
              value={block.reason}
              onChange={(e) => setBlock((b) => ({ ...b, reason: e.target.value }))}
              placeholder="Lunch break, holiday, private event…"
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-medium"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="sw-btn sw-btn-primary" disabled={blockPending}>
              {blockPending ? "Blocking…" : "Block this range"}
            </button>
          </div>
        </form>

        <div className="mt-4 grid gap-2">
          {timeOff.length ? (
            timeOff.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--ln)] px-3.5 py-2.5"
              >
                <div>
                  <div className="text-[13px] font-extrabold">{fmtRange(t.startsAt, t.endsAt, timezone)}</div>
                  <div className="text-[12px]" style={{ color: "var(--mut)" }}>
                    {t.reason || "Blocked"} · slots disabled
                  </div>
                </div>
                <button type="button" className="sw-btn text-[12px]" onClick={() => void removeBlock(t.id)}>
                  Enable again
                </button>
              </div>
            ))
          ) : (
            <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
              No blocked ranges yet. Weekly hours still control the default day pattern.
            </p>
          )}
        </div>
        {msg ? <p className="mt-3 mb-0 text-[13px] font-semibold text-[var(--at)]">{msg}</p> : null}
      </section>
    </div>
  );
}
