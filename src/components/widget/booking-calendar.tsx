"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  mode: "MONTH" | "WEEK";
  /** classic = day/week cards; wide = month grid for HORIZONTAL board */
  look?: "classic" | "wide";
  date: string;
  timezone: string;
  accent: string;
  onAccent: string;
  ink: string;
  mut: string;
  line: string;
  panel: string;
  radius: number;
  onChange: (iso: string) => void;
};

function toIsoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function CalendarGlyph({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={color} strokeWidth="1.8" />
      <path d="M3 10h18" stroke={color} strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function NavBtn({
  children,
  label,
  disabled,
  line,
  ink,
  radius,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  line: string;
  ink: string;
  radius: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center border text-[15px] leading-none transition hover:bg-black/[0.03] disabled:opacity-35"
      style={{
        borderColor: line,
        borderRadius: Math.max(radius - 4, 999),
        color: ink,
        background: "transparent",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export function BookingCalendar({
  mode,
  look = "classic",
  date,
  timezone,
  accent,
  onAccent,
  ink,
  mut,
  line,
  panel,
  radius,
  onChange,
}: Props) {
  const selected = parseIso(date);
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [cursor, setCursor] = useState(() =>
    mode === "WEEK" || look === "classic"
      ? startOfWeek(selected)
      : new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  // Sync cursor only when the selected *date string* changes — never on every render.
  // (Using a Date object in deps remounted cursor and made prev/next arrows flash.)
  useEffect(() => {
    const sel = parseIso(date);
    if (look === "wide" && mode === "MONTH") {
      setCursor((c) => {
        if (sel.getMonth() === c.getMonth() && sel.getFullYear() === c.getFullYear()) return c;
        return new Date(sel.getFullYear(), sel.getMonth(), 1);
      });
      return;
    }
    if (mode === "WEEK") {
      const w = startOfWeek(sel);
      setCursor((c) => (sameDay(w, c) ? c : w));
      return;
    }
    // classic MONTH day-strip: only re-anchor when selection leaves the visible window
    setCursor((c) => {
      const windowEnd = addDays(c, 20);
      if (sel >= c && sel <= windowEnd) return c;
      const start = sel < today ? today : sel;
      const anchor = addDays(start, -3);
      return anchor < today ? today : anchor;
    });
  }, [date, mode, look, today]);

  // Wide month grid (HORIZONTAL board only)
  if (look === "wide" && mode === "MONTH") {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7;
    const gridStart = addDays(first, -startPad);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const label = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const canPrevMonth =
      year > today.getFullYear() ||
      (year === today.getFullYear() && month > today.getMonth());

    return (
      <div className="min-w-0">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="sw-title-lg m-0">Pick a day</h3>
            <p className="sw-title-sm m-0 mt-0.5" style={{ color: mut }}>
              {label}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <NavBtn
              label="Previous month"
              disabled={!canPrevMonth}
              line={line}
              ink={ink}
              radius={radius}
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              ‹
            </NavBtn>
            <NavBtn
              label="Next month"
              line={line}
              ink={ink}
              radius={radius}
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              ›
            </NavBtn>
          </div>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {weekdays.map((w) => (
            <div key={w} className="py-1 text-center text-[11px] font-bold" style={{ color: mut }}>
              {w.charAt(0)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const iso = toIsoLocal(d);
            const inMonth = d.getMonth() === month;
            const past = d < today;
            const on = sameDay(d, selected);
            const disabled = past || !inMonth;
            return (
              <button
                key={`${iso}-${inMonth ? "in" : "out"}`}
                type="button"
                disabled={disabled}
                onClick={() => onChange(iso)}
                className="aspect-square w-full place-items-center text-[14px] transition disabled:cursor-default"
                style={{
                  display: "grid",
                  borderRadius: Math.max(radius - 8, 10),
                  border: "0",
                  background: on ? accent : "transparent",
                  color: on ? onAccent : inMonth ? ink : mut,
                  opacity: inMonth ? (past ? 0.35 : 1) : 0.28,
                  fontWeight: on ? 800 : 600,
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // WEEK: 7-day strip
  if (mode === "WEEK") {
    const days = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    const end = days[6];
    const label =
      cursor.getMonth() === end.getMonth()
        ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : `${cursor.toLocaleDateString(undefined, { month: "short" })} – ${end.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
    const canPrev = addDays(cursor, -7) >= addDays(today, -7);

    return (
      <div className="min-w-0">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h3 className="sw-title-lg m-0">Choose a day</h3>
            <p className="sw-title-sm m-0 mt-0.5" style={{ color: mut }}>
              {label}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NavBtn
              label="Previous week"
              disabled={!canPrev}
              line={line}
              ink={ink}
              radius={radius}
              onClick={() => setCursor(addDays(cursor, -7))}
            >
              ‹
            </NavBtn>
            <NavBtn
              label="Next week"
              line={line}
              ink={ink}
              radius={radius}
              onClick={() => setCursor(addDays(cursor, 7))}
            >
              ›
            </NavBtn>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const iso = toIsoLocal(d);
            const past = d < today;
            const on = sameDay(d, selected);
            return (
              <DayCard
                key={iso}
                day={d}
                on={on}
                disabled={past}
                accent={accent}
                onAccent={onAccent}
                ink={ink}
                mut={mut}
                line={line}
                panel={panel}
                radius={radius}
                onClick={() => onChange(iso)}
              />
            );
          })}
        </div>
        <p className="mb-0 mt-2.5 text-center text-[11px]" style={{ color: mut }}>
          Times in {timezone}
        </p>
      </div>
    );
  }

  // MONTH classic: horizontal scrolling day cards (original default)
  const days = Array.from({ length: 21 }, (_, i) => addDays(cursor < today ? today : cursor, i));
  const canPrevStrip = addDays(cursor, -7) >= addDays(today, -14);
  const monthLabel = selected.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="sw-title-lg m-0">Choose a day</h3>
        <div className="flex items-center gap-1">
          <NavBtn
            label="Earlier days"
            disabled={!canPrevStrip}
            line={line}
            ink={ink}
            radius={radius}
            onClick={() => {
              const next = addDays(cursor, -7);
              setCursor(next < today ? today : next);
            }}
          >
            ‹
          </NavBtn>
          <NavBtn
            label="Later days"
            line={line}
            ink={ink}
            radius={radius}
            onClick={() => setCursor(addDays(cursor, 7))}
          >
            ›
          </NavBtn>
        </div>
      </div>
      <div
        className="sw-w-scroll flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {days.map((d) => {
          const iso = toIsoLocal(d);
          const past = d < today;
          const on = sameDay(d, selected);
          return (
            <DayCard
              key={iso}
              day={d}
              on={on}
              disabled={past}
              accent={accent}
              onAccent={onAccent}
              ink={ink}
              mut={mut}
              line={line}
              panel={panel}
              radius={radius}
              fixedWidth
              onClick={() => onChange(iso)}
            />
          );
        })}
      </div>
      <p className="mb-0 mt-2 text-[11px]" style={{ color: mut }}>
        {monthLabel} · times in {timezone}
      </p>
    </div>
  );
}

function DayCard({
  day,
  on,
  disabled,
  accent,
  onAccent,
  ink,
  mut,
  line,
  panel,
  radius,
  fixedWidth,
  onClick,
}: {
  day: Date;
  on: boolean;
  disabled?: boolean;
  accent: string;
  onAccent: string;
  ink: string;
  mut: string;
  line: string;
  panel: string;
  radius: number;
  fixedWidth?: boolean;
  onClick: () => void;
}) {
  const glyph = on ? onAccent : mut;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`sw-day-card flex flex-col items-center justify-center gap-1 border transition disabled:cursor-not-allowed disabled:opacity-35 ${
        fixedWidth ? "h-[72px] w-[54px] shrink-0" : "min-h-[70px] w-full"
      }`}
      style={{
        borderRadius: Math.max(radius - 4, 12),
        borderColor: on ? accent : line,
        background: on ? accent : panel,
        color: on ? onAccent : ink,
        boxShadow: on ? `0 6px 14px color-mix(in srgb, ${accent} 24%, transparent)` : "none",
      }}
    >
      <CalendarGlyph color={glyph} />
      <small style={{ color: on ? onAccent : mut }}>
        {day.toLocaleDateString(undefined, { weekday: "short" })}
      </small>
      <b>{day.getDate()}</b>
    </button>
  );
}
