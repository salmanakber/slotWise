"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  bufferAfterMin: number;
  minNoticeMin: number;
  active: boolean;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [price, setPrice] = useState(80);
  const [pending, setPending] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/site/services");
    const data = await res.json();
    if (res.ok) setServices(data.services ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(id: string, active: boolean) {
    const res = await fetch(`/api/site/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      setServices((list) => list.map((s) => (s.id === id ? { ...s, active } : s)));
      setMsg(active ? "Service turned on" : "Service turned off");
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
      setMsg("Could not add service");
      return;
    }
    setName("");
    setDurationMin(60);
    setPrice(80);
    setMsg("Service added");
    await load();
  }

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Services</h2>
        <p className="mb-2 text-[13px]" style={{ color: "var(--mut)" }}>
          Duration, price and buffers drive live availability in the booking widget.
        </p>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            Loading…
          </p>
        ) : services.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            No services yet. Add your first one below.
          </p>
        ) : (
          services.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
              <div>
                <b>{s.name}</b>
                <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                  {s.durationMin} min · {formatMoney(s.priceCents)} · buffer {s.bufferAfterMin}m · notice{" "}
                  {s.minNoticeMin}m
                </small>
              </div>
              <button
                type="button"
                className={`sw-tag ${s.active ? "sw-tag-ok" : "sw-tag-muted"}`}
                onClick={() => toggle(s.id, !s.active)}
              >
                {s.active ? "On" : "Off"}
              </button>
            </div>
          ))
        )}
      </section>

      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Add a service</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold sm:col-span-3">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 font-normal"
              placeholder="Deep home clean"
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
            Price (USD)
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
              {pending ? "Adding…" : "Add service"}
            </button>
          </div>
        </form>
        {msg ? <p className="mt-3 text-[13px] font-semibold text-[var(--at)]">{msg}</p> : null}
      </section>
    </div>
  );
}
