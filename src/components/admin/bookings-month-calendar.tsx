"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import type { BookingRow } from "@/components/admin/bookings-board";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_PALETTE = [
  { soft: "#e8f1ff", solid: "#3b82f6", text: "#1e3a8a" },
  { soft: "#f3e8ff", solid: "#8b5cf6", text: "#4c1d95" },
  { soft: "#e7f8ef", solid: "#22c55e", text: "#14532d" },
  { soft: "#fff4e5", solid: "#f59e0b", text: "#7c2d12" },
  { soft: "#ffe8f0", solid: "#ec4899", text: "#9d174d" },
  { soft: "#e6f7f7", solid: "#14b8a6", text: "#115e59" },
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

function colorFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return EVENT_PALETTE[h % EVENT_PALETTE.length];
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type DayCell = {
  date: Date;
  inMonth: boolean;
  items: BookingRow[];
};

export function BookingsMonthCalendar({
  rows,
  timezone,
  onSelect,
}: {
  rows: BookingRow[];
  timezone?: string;
  onSelect?: (row: BookingRow) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const active = useMemo(
    () => rows.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW"),
    [rows],
  );

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startPad = mondayIndex(first.getDay());
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startPad);

    const out: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      const items = active
        .filter((b) => isSameDay(new Date(b.startsAt), date))
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
      out.push({
        date,
        inMonth: date.getMonth() === cursor.getMonth(),
        items,
      });
    }
    return out;
  }, [cursor, active]);

  const tz =
    timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "Local";

  return (
    <div className="overflow-hidden rounded-[22px] border border-[var(--ln)] bg-[var(--pn)] shadow-[0_1px_0_rgba(18,26,38,.04),0_18px_40px_rgba(18,26,38,.06)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ln)] px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="rounded-full border border-[var(--ln)] bg-[var(--sf)] px-3.5 py-1.5 text-[12.5px] font-bold hover:border-[var(--ac)]"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--ln)] bg-[var(--sf)] hover:border-[var(--ac)]"
            aria-label="Previous month"
            onClick={() => setCursor((c) => addMonths(c, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--ln)] bg-[var(--sf)] hover:border-[var(--ac)]"
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight size={16} />
          </button>
          <h2
            className="ml-1 text-[17px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
          >
            {monthLabel(cursor)}
          </h2>
        </div>
        <div className="ml-auto flex rounded-full border border-[var(--ln)] bg-[var(--sf)] p-0.5">
          <span className="rounded-full bg-[var(--pn)] px-3.5 py-1.5 text-[12px] font-extrabold shadow-sm">
            Month
          </span>
          <span
            className="rounded-full px-3.5 py-1.5 text-[12px] font-bold"
            style={{ color: "var(--mut)" }}
            title="Week view coming soon"
          >
            Week
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-[var(--ln)] bg-[var(--sf)]/60">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.06em]"
            style={{ color: "var(--mut)" }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[minmax(108px,1fr)]">
        {cells.map((cell) => {
          const isToday = isSameDay(cell.date, today);
          const visible = cell.items.slice(0, 3);
          const more = cell.items.length - visible.length;
          return (
            <div
              key={cell.date.toISOString()}
              className="min-h-[108px] border-b border-r border-[var(--ln)] p-1.5 last:border-r-0"
              style={{
                background: cell.inMonth ? "var(--pn)" : "color-mix(in srgb, var(--sf) 70%, transparent)",
                opacity: cell.inMonth ? 1 : 0.55,
              }}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[12.5px] font-bold ${
                    isToday ? "bg-[#3b82f6] text-white shadow-[0_6px_14px_rgba(59,130,246,.35)]" : ""
                  }`}
                  style={!isToday ? { color: "var(--ink)" } : undefined}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {visible.map((ev, idx) => {
                  const tone = colorFor(ev.service.name || ev.id);
                  const banner = idx === 0 && cell.items.length === 1;
                  if (banner) {
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelect?.(ev)}
                        className="truncate rounded-md px-1.5 py-1 text-left text-[11px] font-bold leading-tight text-white"
                        style={{ background: tone.solid }}
                        title={`${ev.customerName} · ${ev.service.name}`}
                      >
                        {ev.service.name}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelect?.(ev)}
                      className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left hover:brightness-[0.98]"
                      style={{ background: tone.soft }}
                      title={`${timeLabel(ev.startsAt)} · ${ev.customerName}`}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: tone.solid }}
                      />
                      <span
                        className="truncate text-[11px] font-semibold leading-tight"
                        style={{ color: tone.text }}
                      >
                        {ev.customerName}
                      </span>
                    </button>
                  );
                })}
                {more > 0 ? (
                  <span className="px-1 text-[10.5px] font-bold" style={{ color: "var(--mut)" }}>
                    +{more} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--ln)] px-4 py-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-[12px] font-semibold">
          <Globe size={14} style={{ color: "var(--mut)" }} />
          <span style={{ color: "var(--mut)" }}>{tz}</span>
        </span>
        <span className="ml-auto text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
          {active.length} active booking{active.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
