"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, List, X } from "lucide-react";
import { BookingsMonthCalendar } from "@/components/admin/bookings-month-calendar";
import { formatMoney } from "@/lib/utils";

export type BookingRow = {
  id: string;
  reference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  amountCents: number;
  depositCents: number;
  currency: string;
  stripePaymentId: string | null;
  meetingUrl?: string | null;
  meetingProvider?: string | null;
  cancelledAt: string | null;
  createdAt: string;
  service: { name: string; durationMinutes?: number };
  location: { name: string } | null;
  staff: { staff: { name: string } }[];
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Today" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "cancelled", label: "Cancelled" },
] as const;

const PAGE_SIZE = 10;

function statusClass(status: string) {
  if (status === "PAID" || status === "CONFIRMED" || status === "COMPLETED") return "sw-tag-ok";
  if (status === "CANCELLED" || status === "NO_SHOW") return "sw-tag-bad";
  if (status === "DEPOSIT" || status === "PENDING") return "";
  return "sw-tag-muted";
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type BookingsSummary = {
  total: number;
  upcoming: number;
  pending: number;
  revenue: number;
  deposits: number;
};

export function BookingsBoard({
  rows,
  currency = "USD",
  summary: summaryProp,
}: {
  rows: BookingRow[];
  currency?: string;
  /** Live aggregates from the DB (preferred over summing loaded rows). */
  summary?: BookingsSummary | null;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((b) => {
      const start = new Date(b.startsAt);
      if (filter === "upcoming" && !(start >= now && b.status !== "CANCELLED")) return false;
      if (filter === "today" && !(isSameDay(start, now) && b.status !== "CANCELLED")) return false;
      if (filter === "pending" && b.status !== "PENDING") return false;
      if (filter === "paid" && !(b.status === "PAID" || b.status === "DEPOSIT")) return false;
      if (filter === "cancelled" && b.status !== "CANCELLED" && b.status !== "NO_SHOW") return false;
      if (!query) return true;
      const hay = [
        b.reference,
        b.customerName,
        b.customerEmail,
        b.customerPhone ?? "",
        b.service.name,
        b.status,
        b.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [rows, filter, q, now]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = selectedId ? rows.find((b) => b.id === selectedId) ?? null : null;

  useEffect(() => {
    setPage(1);
  }, [filter, q]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedId]);

  const summary = useMemo(() => {
    if (summaryProp) return summaryProp;
    const active = rows.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW");
    const upcoming = active.filter((b) => new Date(b.startsAt) >= now);
    const revenue = rows
      .filter((b) => ["PAID", "DEPOSIT", "CONFIRMED", "COMPLETED"].includes(b.status))
      .reduce((s, b) => s + b.amountCents, 0);
    const deposits = rows
      .filter((b) => ["PAID", "DEPOSIT", "CONFIRMED", "COMPLETED"].includes(b.status))
      .reduce((s, b) => s + b.depositCents, 0);
    const pending = rows.filter((b) => b.status === "PENDING").length;
    return { total: rows.length, upcoming: upcoming.length, revenue, deposits, pending };
  }, [rows, now, summaryProp]);

  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="grid gap-3.5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total bookings", value: String(summary.total) },
          { label: "Upcoming", value: String(summary.upcoming) },
          { label: "Pending", value: String(summary.pending) },
          {
            label: "Tracked revenue",
            value: formatMoney(summary.revenue, currency),
            sub:
              summary.deposits > 0
                ? `${formatMoney(summary.deposits, currency)} deposits`
                : undefined,
          },
        ].map((k) => (
          <div key={k.label} className="sw-card !p-3.5">
            <div
              className="flex items-center justify-between gap-2 text-[12px] font-semibold uppercase tracking-[0.04em]"
              style={{ color: "var(--mut)" }}
            >
              <span>{k.label}</span>
              {summaryProp ? (
                <em className="sw-tag sw-tag-ok !text-[10px] !normal-case !tracking-normal">Live</em>
              ) : null}
            </div>
            <div className="mt-1 text-[24px] font-extrabold leading-none">{k.value}</div>
            {k.sub ? (
              <div className="mt-1.5 text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
                {k.sub}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full border border-[var(--ln)] bg-[var(--sf)] p-0.5">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-extrabold transition ${
              view === "calendar" ? "bg-[var(--pn)] shadow-sm" : ""
            }`}
            style={view !== "calendar" ? { color: "var(--mut)" } : undefined}
            onClick={() => setView("calendar")}
          >
            <CalendarDays size={14} />
            Calendar
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-extrabold transition ${
              view === "list" ? "bg-[var(--pn)] shadow-sm" : ""
            }`}
            style={view !== "list" ? { color: "var(--mut)" } : undefined}
            onClick={() => setView("list")}
          >
            <List size={14} />
            List
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <BookingsMonthCalendar
          rows={rows}
          timezone={rows[0]?.timezone}
          onSelect={(b) => setSelectedId(b.id)}
        />
      ) : null}

      {view === "list" ? (
      <section className="sw-card overflow-hidden !p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ln)] px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${
                  filter === f.id
                    ? "bg-[var(--ac)] text-[var(--on)]"
                    : "border border-[var(--ln)] text-[var(--mut)] hover:text-[var(--ink)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, ref…"
            className="ml-auto min-w-[200px] flex-1 rounded-lg border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--ac)]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr
                className="border-b border-[var(--ln)] text-[11.5px] font-bold uppercase tracking-[0.05em]"
                style={{ color: "var(--mut)" }}
              >
                {["When", "Customer", "Service", "Staff", "Amount", "Status", "Meeting", ""].map((h) => (
                  <th key={h || "actions"} className="px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: "var(--mut)" }}>
                    No bookings match this view. Share your booking link to get appointments in.
                  </td>
                </tr>
              ) : (
                pageRows.map((b) => {
                  const start = new Date(b.startsAt);
                  const end = new Date(b.endsAt);
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-[var(--ln)] last:border-b-0 hover:bg-[var(--bg)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                        <div className="text-[13px] font-extrabold">
                          {start.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[12px]" style={{ color: "var(--mut)" }}>
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-bold">{b.customerName}</div>
                        <div className="text-[12px]" style={{ color: "var(--mut)" }}>
                          {b.reference}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-[13px]">{b.service.name}</td>
                      <td className="px-4 py-3.5 align-middle text-[13px]" style={{ color: "var(--mut)" }}>
                        {b.staff.map((s) => s.staff.name).join(", ") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                        <div className="font-extrabold">{formatMoney(b.amountCents, b.currency)}</div>
                        {b.depositCents > 0 ? (
                          <div className="text-[11.5px]" style={{ color: "var(--mut)" }}>
                            {formatMoney(b.depositCents, b.currency)} deposit
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <em className={`sw-tag ${statusClass(b.status)}`}>{b.status}</em>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {b.meetingUrl ? (
                          <a
                            href={b.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--ln)] px-2 py-1 text-[11.5px] font-extrabold hover:brightness-[0.98]"
                            style={{ color: "var(--ac)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {b.meetingProvider === "zoom" ? "Zoom" : "Meet"}
                          </a>
                        ) : (
                          <span className="text-[12px]" style={{ color: "var(--mut)" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        <button
                          type="button"
                          className="sw-btn !px-3 !py-1.5"
                          onClick={() => setSelectedId(b.id)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] px-4 py-3">
          <div className="text-[12.5px] font-semibold" style={{ color: "var(--mut)" }}>
            {filtered.length === 0
              ? "0 bookings"
              : `Showing ${from}–${to} of ${filtered.length}`}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="sw-btn !px-3 !py-1.5 disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pageCount || Math.abs(n - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, idx) =>
                  n === "…" ? (
                    <span key={`e-${idx}`} className="px-1 text-[12px]" style={{ color: "var(--mut)" }}>
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`min-w-8 rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold ${
                        n === safePage
                          ? "bg-[var(--ac)] text-[var(--on)]"
                          : "border border-[var(--ln)] text-[var(--mut)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {n}
                    </button>
                  ),
                )}
            </div>
            <button
              type="button"
              className="sw-btn !px-3 !py-1.5 disabled:opacity-40"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      ) : null}

      {selected ? (
        <BookingDrawer booking={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}

function BookingDrawer({
  booking: b,
  onClose,
}: {
  booking: BookingRow;
  onClose: () => void;
}) {
  const start = new Date(b.startsAt);
  const end = new Date(b.endsAt);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-[420px] animate-[sw-drawer-in_220ms_ease-out] flex-col border-l border-[var(--ln)] bg-[var(--pn)] shadow-[-12px_0_40px_rgba(0,0,0,.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-drawer-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--ln)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--mut)" }}>
              Booking {b.reference}
            </div>
            <h2 id="booking-drawer-title" className="m-0 mt-1 truncate text-[18px] font-extrabold">
              {b.customerName}
            </h2>
            <div className="mt-2">
              <em className={`sw-tag ${statusClass(b.status)}`}>{b.status}</em>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[var(--ln)] p-2 text-[var(--mut)] hover:text-[var(--ink)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <section className="mb-5 rounded-2xl border border-[var(--ln)] bg-[var(--bg)] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--mut)" }}>
              Schedule
            </div>
            <div className="mt-2 text-[15px] font-extrabold">
              {start.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div className="mt-0.5 text-[13px]" style={{ color: "var(--mut)" }}>
              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" – "}
              {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {` · ${b.timezone}`}
            </div>
          </section>

          <div className="grid gap-4">
            <DetailBlock title="Customer">
              <DetailRow label="Name" value={b.customerName} />
              <DetailRow label="Email" value={b.customerEmail} href={`mailto:${b.customerEmail}`} />
              <DetailRow
                label="Phone"
                value={b.customerPhone || "—"}
                href={b.customerPhone ? `tel:${b.customerPhone}` : undefined}
              />
            </DetailBlock>

            <DetailBlock title="Appointment">
              <DetailRow label="Service" value={b.service.name} />
              <DetailRow
                label="Staff"
                value={b.staff.map((s) => s.staff.name).join(", ") || "Unassigned"}
              />
              <DetailRow label="Location" value={b.location?.name || "—"} />
            </DetailBlock>

            <DetailBlock title="Meeting tools">
              <DetailRow
                label="Provider"
                value={
                  b.meetingProvider === "zoom"
                    ? "Zoom"
                    : b.meetingProvider === "meet"
                      ? "Google Meet"
                      : "Not added yet"
                }
              />
              <DetailRow
                label="Join link"
                value={b.meetingUrl || "Customer can add Zoom or Meet after booking"}
                href={b.meetingUrl || undefined}
              />
            </DetailBlock>

            <DetailBlock title="Payment">
              <DetailRow label="Amount" value={formatMoney(b.amountCents, b.currency)} />
              <DetailRow
                label="Deposit"
                value={b.depositCents > 0 ? formatMoney(b.depositCents, b.currency) : "None"}
              />
              <DetailRow label="Stripe" value={b.stripePaymentId || "Not charged yet"} />
            </DetailBlock>

            <DetailBlock title="Meta">
              <DetailRow label="Booked on" value={new Date(b.createdAt).toLocaleString()} />
              <DetailRow
                label="Cancelled"
                value={b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : "—"}
              />
              <DetailRow label="Notes" value={b.notes?.trim() || "No notes"} />
            </DetailBlock>
          </div>
        </div>

        <footer className="border-t border-[var(--ln)] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {b.meetingUrl ? (
              <a
                className="sw-btn sw-btn-primary flex-1 text-center"
                href={b.meetingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open {b.meetingProvider === "zoom" ? "Zoom" : "Meet"}
              </a>
            ) : null}
            <a className="sw-btn flex-1 text-center" href={`mailto:${b.customerEmail}`}>
              Email customer
            </a>
            <button type="button" className="sw-btn flex-1" onClick={onClose}>
              Close
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3
        className="m-0 mb-2 text-[11px] font-extrabold uppercase tracking-[0.07em]"
        style={{ color: "var(--mut)" }}
      >
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-[var(--ln)]">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--ln)] px-3.5 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: "var(--mut)" }}>
        {label}
      </span>
      {href ? (
        <a className="text-right text-[13px] font-bold underline break-all" href={href}>
          {value}
        </a>
      ) : (
        <span className="text-right text-[13px] font-bold break-words">{value}</span>
      )}
    </div>
  );
}
