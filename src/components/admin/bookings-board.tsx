"use client";

import { useMemo, useState } from "react";
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

export function BookingsBoard({
  rows,
  currency = "USD",
}: {
  rows: BookingRow[];
  currency?: string;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
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

  const summary = useMemo(() => {
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
  }, [rows, now]);

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
            sub: summary.deposits > 0 ? `${formatMoney(summary.deposits, currency)} deposits` : undefined,
          },
        ].map((k) => (
          <div key={k.label} className="sw-card !p-3.5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.04em]" style={{ color: "var(--mut)" }}>
              {k.label}
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
          <em className="sw-tag sw-tag-muted">{filtered.length} shown</em>
        </div>

        {filtered.length === 0 ? (
          <p className="m-0 px-4 py-10 text-sm" style={{ color: "var(--mut)" }}>
            No bookings match this view. Share your booking link to get appointments in.
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {filtered.map((b) => {
              const open = openId === b.id;
              const start = new Date(b.startsAt);
              const end = new Date(b.endsAt);
              return (
                <li key={b.id} className="border-t border-[var(--ln)] first:border-t-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : b.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-[var(--bg)]"
                  >
                    <div className="w-[7.5rem] shrink-0">
                      <div className="text-[13px] font-extrabold">
                        {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--mut)" }}>
                        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{b.customerName}</span>
                        <em className={`sw-tag ${statusClass(b.status)}`}>{b.status}</em>
                        <span className="text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
                          {b.reference}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[13px]" style={{ color: "var(--mut)" }}>
                        {b.service.name}
                        {b.staff.length ? ` · ${b.staff.map((s) => s.staff.name).join(", ")}` : ""}
                        {b.location ? ` · ${b.location.name}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-extrabold">{formatMoney(b.amountCents, b.currency)}</div>
                      {b.depositCents > 0 ? (
                        <div className="text-[11.5px] font-semibold" style={{ color: "var(--mut)" }}>
                          {formatMoney(b.depositCents, b.currency)} deposit
                        </div>
                      ) : null}
                    </div>
                  </button>

                  {open ? (
                    <div className="grid gap-3 border-t border-[var(--ln)] bg-[var(--bg)] px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label="Customer" value={b.customerName} />
                      <Detail label="Email" value={b.customerEmail} href={`mailto:${b.customerEmail}`} />
                      <Detail
                        label="Phone"
                        value={b.customerPhone || "—"}
                        href={b.customerPhone ? `tel:${b.customerPhone}` : undefined}
                      />
                      <Detail label="Service" value={b.service.name} />
                      <Detail
                        label="Staff"
                        value={b.staff.map((s) => s.staff.name).join(", ") || "Unassigned"}
                      />
                      <Detail label="Location" value={b.location?.name || "—"} />
                      <Detail
                        label="When"
                        value={`${start.toLocaleString()} → ${end.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} (${b.timezone})`}
                      />
                      <Detail label="Amount" value={formatMoney(b.amountCents, b.currency)} />
                      <Detail
                        label="Deposit"
                        value={
                          b.depositCents > 0 ? formatMoney(b.depositCents, b.currency) : "None"
                        }
                      />
                      <Detail label="Payment" value={b.stripePaymentId || "Not charged yet"} />
                      <Detail
                        label="Booked on"
                        value={new Date(b.createdAt).toLocaleString()}
                      />
                      <Detail
                        label="Cancelled"
                        value={b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : "—"}
                      />
                      <div className="sm:col-span-2 lg:col-span-3">
                        <Detail label="Notes" value={b.notes?.trim() || "No notes"} />
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--mut)" }}>
        {label}
      </div>
      {href ? (
        <a className="mt-0.5 block text-[13.5px] font-semibold underline" href={href}>
          {value}
        </a>
      ) : (
        <div className="mt-0.5 text-[13.5px] font-semibold break-words">{value}</div>
      )}
    </div>
  );
}
