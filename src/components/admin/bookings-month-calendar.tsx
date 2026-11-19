"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Globe, X } from "lucide-react";
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

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
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

function dayLabel(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

function icsStamp(d: Date) {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCsv(rows: BookingRow[], label: string) {
  const header = [
    "Reference",
    "Customer",
    "Email",
    "Phone",
    "Service",
    "Starts",
    "Ends",
    "Timezone",
    "Status",
    "Amount",
    "Currency",
  ];
  const lines = [
    header.join(","),
    ...rows.map((b) =>
      [
        b.reference,
        b.customerName,
        b.customerEmail,
        b.customerPhone || "",
        b.service.name,
        b.startsAt,
        b.endsAt,
        b.timezone,
        b.status,
        (b.amountCents / 100).toFixed(2),
        b.currency,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const slug = label.toLowerCase().replace(/\s+/g, "-");
  downloadBlob(`slotwise-bookings-${slug}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}

function exportIcs(rows: BookingRow[], label: string) {
  const events = rows
    .map((b) => {
      const uid = `${b.reference.replace(/\W/g, "")}@slotwise`;
      const summary = `${b.service.name} · ${b.customerName}`.replace(/[,;]/g, " ");
      const desc = [`Ref ${b.reference}`, b.customerEmail, b.customerPhone || ""]
        .filter(Boolean)
        .join("\\n");
      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${icsStamp(new Date())}`,
        `DTSTART:${icsStamp(new Date(b.startsAt))}`,
        `DTEND:${icsStamp(new Date(b.endsAt))}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slotwise//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");

  const slug = label.toLowerCase().replace(/\s+/g, "-");
  downloadBlob(`slotwise-bookings-${slug}.ics`, ics, "text/calendar;charset=utf-8");
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
  const [dayPopup, setDayPopup] = useState<{ date: Date; items: BookingRow[] } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => rows.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW"),
    [rows],
  );

  const monthRows = useMemo(() => {
    const from = startOfMonth(cursor).getTime();
    const to = endOfMonth(cursor).getTime();
    return active.filter((b) => {
      const t = new Date(b.startsAt).getTime();
      return t >= from && t <= to;
    });
  }, [active, cursor]);

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

  useEffect(() => {
    if (!dayPopup && !exportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDayPopup(null);
        setExportOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dayPopup, exportOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  const tz =
    timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "Local";

  const label = monthLabel(cursor);

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
            {label}
          </h2>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ln)] bg-[var(--sf)] px-3.5 py-1.5 text-[12.5px] font-bold hover:border-[var(--ac)]"
              onClick={() => setExportOpen((v) => !v)}
              aria-expanded={exportOpen}
            >
              <Download size={14} />
              Export
            </button>
            {exportOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[200px] overflow-hidden rounded-2xl border border-[var(--ln)] bg-[var(--pn)] py-1.5 shadow-[0_18px_40px_rgba(0,0,0,.16)]">
                <button
                  type="button"
                  className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold hover:bg-[var(--sf)]"
                  onClick={() => {
                    exportCsv(monthRows, label);
                    setExportOpen(false);
                  }}
                >
                  Export month as CSV
                </button>
                <button
                  type="button"
                  className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold hover:bg-[var(--sf)]"
                  onClick={() => {
                    exportIcs(monthRows, label);
                    setExportOpen(false);
                  }}
                >
                  Export month as ICS
                </button>
                <button
                  type="button"
                  className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold hover:bg-[var(--sf)]"
                  onClick={() => {
                    exportCsv(active, "all-bookings");
                    setExportOpen(false);
                  }}
                >
                  Export all as CSV
                </button>
                <button
                  type="button"
                  className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold hover:bg-[var(--sf)]"
                  onClick={() => {
                    exportIcs(active, "all-bookings");
                    setExportOpen(false);
                  }}
                >
                  Export all as ICS
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex rounded-full border border-[var(--ln)] bg-[var(--sf)] p-0.5">
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
                  <button
                    type="button"
                    className="rounded-md px-1 py-0.5 text-left text-[10.5px] font-bold hover:underline"
                    style={{ color: "var(--mut)" }}
                    onClick={() => setDayPopup({ date: cell.date, items: cell.items })}
                  >
                    +{more} more
                  </button>
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
          {monthRows.length} this month · {active.length} active
        </span>
      </div>

      {dayPopup ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sw-day-popup-title"
          onClick={() => setDayPopup(null)}
        >
          <div
            className="w-full max-w-[440px] overflow-hidden rounded-[24px] border border-[var(--ln)] bg-[var(--pn)] shadow-[0_30px_80px_rgba(0,0,0,.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--ln)] px-5 py-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--mut)" }}>
                  {dayPopup.items.length} booking{dayPopup.items.length === 1 ? "" : "s"}
                </div>
                <h3 id="sw-day-popup-title" className="m-0 mt-1 text-[17px] font-extrabold tracking-tight">
                  {dayLabel(dayPopup.date)}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[var(--ln)] p-2"
                aria-label="Close"
                onClick={() => setDayPopup(null)}
              >
                <X size={16} />
              </button>
            </header>
            <div className="max-h-[min(60vh,420px)] overflow-y-auto px-3 py-3">
              <div className="grid gap-2">
                {dayPopup.items.map((ev) => {
                  const tone = colorFor(ev.service.name || ev.id);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-2xl border border-[var(--ln)] bg-[var(--sf)] px-3.5 py-3 text-left transition hover:border-[color-mix(in_srgb,var(--ac)_40%,var(--ln))]"
                      onClick={() => {
                        setDayPopup(null);
                        onSelect?.(ev);
                      }}
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: tone.solid }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-extrabold">{ev.customerName}</div>
                        <div className="mt-0.5 truncate text-[12.5px]" style={{ color: "var(--mut)" }}>
                          {timeLabel(ev.startsAt)} · {ev.service.name}
                        </div>
                        <div className="mt-1 text-[11.5px] font-semibold" style={{ color: "var(--mut)" }}>
                          {ev.reference} · {ev.status}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <footer className="flex flex-wrap gap-2 border-t border-[var(--ln)] px-4 py-3">
              <button
                type="button"
                className="sw-btn"
                onClick={() => {
                  exportCsv(dayPopup.items, dayLabel(dayPopup.date));
                }}
              >
                Export day CSV
              </button>
              <button
                type="button"
                className="sw-btn"
                onClick={() => {
                  exportIcs(dayPopup.items, dayLabel(dayPopup.date));
                }}
              >
                Export day ICS
              </button>
              <button type="button" className="sw-btn sw-btn-primary ml-auto" onClick={() => setDayPopup(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
