"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatMoney, formatPrice } from "@/lib/utils";

type ServiceStats = {
  bookingsAll: number;
  bookingsMonth: number;
  upcoming: number;
  revenueCents: number;
  depositCents: number;
  revenueMonthCents: number;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  bufferAfterMin: number;
  minNoticeMin: number;
  active: boolean;
  category?: string | null;
  color?: string | null;
  featured?: boolean;
  stats?: ServiceStats;
};

const emptyStats: ServiceStats = {
  bookingsAll: 0,
  bookingsMonth: 0,
  upcoming: 0,
  revenueCents: 0,
  depositCents: 0,
  revenueMonthCents: 0,
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [price, setPrice] = useState(0);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [report, setReport] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    durationMin: 60,
    price: 0,
    bufferAfterMin: 15,
    minNoticeMin: 240,
    active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/site/services", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setServices(data.services ?? []);
      setCurrency(data.currency || "USD");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    return services.reduce(
      (acc, s) => {
        const st = s.stats || emptyStats;
        acc.bookings += st.bookingsAll;
        acc.revenue += st.revenueCents;
        acc.month += st.revenueMonthCents;
        return acc;
      },
      { bookings: 0, revenue: 0, month: 0 },
    );
  }, [services]);

  function openEdit(s: Service) {
    setEditing(s);
    setEditForm({
      name: s.name,
      description: s.description || "",
      durationMin: s.durationMin,
      price: s.priceCents / 100,
      bufferAfterMin: s.bufferAfterMin,
      minNoticeMin: s.minNoticeMin,
      active: s.active,
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setMsg("");
    const res = await fetch(`/api/site/services/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        durationMin: editForm.durationMin,
        priceCents: Math.round(editForm.price * 100),
        bufferAfterMin: editForm.bufferAfterMin,
        minNoticeMin: editForm.minNoticeMin,
        active: editForm.active,
      }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      setMsg("Could not save event");
      return;
    }
    setEditing(null);
    setMsg("Event updated");
    await load();
  }

  async function toggle(id: string, active: boolean) {
    const res = await fetch(`/api/site/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      setServices((list) => list.map((s) => (s.id === id ? { ...s, active } : s)));
      setMsg(active ? "Event turned on" : "Event turned off");
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg("");
    const res = await fetch("/api/site/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        durationMin,
        priceCents: Math.round(price * 100),
        bufferAfterMin: 15,
        minNoticeMin: 240,
      }),
    });
    setPending(false);
    if (!res.ok) {
      setMsg("Could not add event");
      return;
    }
    setName("");
    setDurationMin(60);
    setPrice(0);
    setMsg("Event added");
    await load();
  }

  return (
    <div className="grid gap-3.5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total bookings", value: String(totals.bookings) },
          { label: "All-time revenue", value: formatMoney(totals.revenue, currency) },
          { label: "Revenue this month", value: formatMoney(totals.month, currency) },
        ].map((k) => (
          <div key={k.label} className="sw-card !py-3.5">
            <div className="text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
              {k.label}
            </div>
            <div className="mt-1 text-[22px] font-extrabold leading-none">{k.value}</div>
          </div>
        ))}
      </div>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Events</h2>
        <p className="mb-2 text-[13px]" style={{ color: "var(--mut)" }}>
          Edit events, toggle availability, and open a full performance report.
        </p>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            Loading…
          </p>
        ) : services.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            No events yet. Add your first one below.
          </p>
        ) : (
          services.map((s) => {
            const st = s.stats || emptyStats;
            return (
              <div
                key={s.id}
                className="grid gap-3 border-t border-[var(--ln)] py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[14px]">{s.name}</b>
                    <em className={`sw-tag ${s.active ? "sw-tag-ok" : "sw-tag-muted"}`}>
                      {s.active ? "Live" : "Off"}
                    </em>
                  </div>
                  <small className="mt-1 block text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {s.durationMin} min · {formatPrice(s.priceCents, currency)} ·{" "}
                    {st.bookingsAll} bookings · {formatMoney(st.revenueCents, currency)} revenue
                  </small>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="sw-btn" onClick={() => setReport(s)}>
                    Report
                  </button>
                  <button type="button" className="sw-btn" onClick={() => openEdit(s)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="sw-btn"
                    onClick={() => void toggle(s.id, !s.active)}
                  >
                    {s.active ? "Turn off" : "Turn on"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Add an event</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold sm:col-span-3">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
              placeholder="30-minute consultation"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Duration (min)
            <input
              type="number"
              min={5}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Price (0 = free, no label shown)
            <input
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="sw-btn sw-btn-primary w-full" disabled={pending}>
              {pending ? "Adding…" : "Add event"}
            </button>
          </div>
        </form>
        {msg ? <p className="mt-3 text-[13px] font-semibold text-[var(--at)]">{msg}</p> : null}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setEditing(null)}
          />
          <form
            onSubmit={saveEdit}
            className="relative z-[1] w-full max-w-lg rounded-2xl border border-[var(--ln)] bg-[var(--pn)] p-4 shadow-xl"
          >
            <h3 className="m-0 text-[16px] font-extrabold">Edit event</h3>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Name
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Description
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold">
                  Duration (min)
                  <input
                    type="number"
                    min={5}
                    value={editForm.durationMin}
                    onChange={(e) =>
                      setEditForm({ ...editForm, durationMin: Number(e.target.value) })
                    }
                    className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Price
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Buffer after (min)
                  <input
                    type="number"
                    min={0}
                    value={editForm.bufferAfterMin}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bufferAfterMin: Number(e.target.value) })
                    }
                    className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Min notice (min)
                  <input
                    type="number"
                    min={0}
                    value={editForm.minNoticeMin}
                    onChange={(e) =>
                      setEditForm({ ...editForm, minNoticeMin: Number(e.target.value) })
                    }
                    className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                />
                Active in booking widget
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" className="sw-btn sw-btn-primary" disabled={savingEdit}>
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="sw-btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {report ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setReport(null)}
          />
          <div className="relative z-[1] w-full max-w-lg rounded-2xl border border-[var(--ln)] bg-[var(--pn)] p-4 shadow-xl">
            <h3 className="m-0 text-[16px] font-extrabold">{report.name} report</h3>
            <p className="mt-1 text-[13px]" style={{ color: "var(--mut)" }}>
              Complete performance for this event
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {[
                { label: "All-time bookings", value: String(report.stats?.bookingsAll ?? 0) },
                { label: "This month", value: String(report.stats?.bookingsMonth ?? 0) },
                { label: "Upcoming", value: String(report.stats?.upcoming ?? 0) },
                {
                  label: "All-time revenue",
                  value: formatMoney(report.stats?.revenueCents ?? 0, currency),
                },
                {
                  label: "Revenue this month",
                  value: formatMoney(report.stats?.revenueMonthCents ?? 0, currency),
                },
                {
                  label: "Deposits collected",
                  value: formatMoney(report.stats?.depositCents ?? 0, currency),
                },
              ].map((row) => (
                <div key={row.label} className="rounded-xl border border-[var(--ln)] bg-[var(--bg)] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--mut)" }}>
                    {row.label}
                  </div>
                  <div className="mt-1 text-[18px] font-extrabold">{row.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="sw-btn sw-btn-primary"
                onClick={() => {
                  const s = report;
                  setReport(null);
                  openEdit(s);
                }}
              >
                Edit event
              </button>
              <a href="/dashboard/bookings" className="sw-btn">
                All bookings
              </a>
              <button type="button" className="sw-btn" onClick={() => setReport(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
