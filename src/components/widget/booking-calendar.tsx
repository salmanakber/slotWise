"use client";

import { useEffect, useState } from "react";

type Props = {
  mode: "MONTH" | "WEEK";
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
      className="grid h-8 w-8 place-items-center border text-[18px] leading-none transition disabled:opacity-35"
      style={{
        borderColor: line,
        borderRadius: Math.max(radius - 4, 999),
        color: ink,
        background: "transparent",
      }}
    >
      {children}
    </button>
  );
}

export function BookingCalendar({
  mode,
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [cursor, setCursor] = useState(() =>
    mode === "WEEK" ? startOfWeek(selected) : new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  useEffect(() => {
    if (mode === "WEEK") {
      const w = startOfWeek(selected);
      setCursor((c) => (sameDay(w, c) ? c : w));
      return;
    }
    setCursor((c) => {
      if (selected.getMonth() === c.getMonth() && selected.getFullYear() === c.getFullYear()) {
        return c;
      }
      return new Date(selected.getFullYear(), selected.getMonth(), 1);
    });
  }, [date, mode, selected]);

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
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="m-0 text-[15px] font-extrabold tracking-tight">Pick a day</h3>
            <p className="m-0 mt-0.5 text-[12px]" style={{ color: mut }}>
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
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const iso = toIsoLocal(d);
            const past = d < today;
            const on = sameDay(d, selected);
            return (
              <button
                key={iso}
                type="button"
                disabled={past}
                onClick={() => onChange(iso)}
                className="flex min-h-[64px] flex-col items-center justify-center gap-0.5 border transition disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  borderRadius: Math.max(radius - 4, 12),
                  borderColor: on ? accent : line,
                  background: on
                    ? accent
                    : `color-mix(in srgb, ${panel} 88%, ${accent} 4%)`,
                  color: on ? onAccent : ink,
                  boxShadow: on
                    ? `0 10px 22px color-mix(in srgb, ${accent} 28%, transparent)`
                    : "none",
                }}
              >
                <small
                  className="text-[10px] font-bold uppercase tracking-[0.04em]"
                  style={{ opacity: on ? 0.85 : 0.7, color: on ? onAccent : mut }}
                >
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </small>
                <b className="text-[18px] font-extrabold leading-none tracking-tight">
                  {d.getDate()}
                </b>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
          <h3 className="m-0 text-[15px] font-extrabold tracking-tight">Pick a day</h3>
          <p className="m-0 mt-0.5 text-[12px]" style={{ color: mut }}>
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
          <div
            key={w}
            className="py-1 text-center text-[11px] font-bold"
            style={{ color: mut }}
          >
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
