"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
};

type Payload = {
  staff: StaffRow[];
  staffLimit: number | null;
  staffAllowed: boolean;
  upgradeLabel: string;
  upgradeUrl: string;
  showStaff: boolean;
};

export default function StaffPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/site/staff", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setData(json);
    else setMsg(json.error || "Could not load team");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setMsg("");
    try {
      const res = await fetch("/api/site/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null, active: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add");
      setName("");
      setEmail("");
      setMsg(`Added ${json.name}`);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not add");
    } finally {
      setPending(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/site/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = data?.staff.filter((s) => s.active).length ?? 0;
  const limitLabel =
    data?.staffLimit == null ? "Unlimited" : `${activeCount} / ${data.staffLimit} active`;

  return (
    <div className="grid gap-4">
      {msg ? (
        <p className="m-0 text-[13px] font-semibold" style={{ color: "var(--mut)" }}>
          {msg}
        </p>
      ) : null}

      <section className="sw-card">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="m-0 text-[15px] font-extrabold">Team · Who</h2>
            <p className="mb-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
              People shown in the booking calendar under <strong>Who</strong> (Anyone + your team).
              Toggle active to show or hide them. Branding → “Show staff picker” must be on.
            </p>
          </div>
          <em className="sw-tag sw-tag-muted">{limitLabel}</em>
        </div>

        {!data?.staffAllowed ? (
          <p className="mb-3 rounded-[12px] border border-[var(--ln)] bg-[var(--sf)] px-3 py-2.5 text-[13px]">
            Team members unlock on <strong>{data?.upgradeLabel || "Pro"}</strong>.{" "}
            <Link href={data?.upgradeUrl || "/dashboard/plans"} className="font-extrabold underline">
              Upgrade plans
            </Link>
          </p>
        ) : null}

        {data && data.showStaff === false ? (
          <p className="mb-3 rounded-[12px] border border-[var(--ln)] px-3 py-2.5 text-[13px]">
            Staff picker is hidden on the widget. Turn it on in{" "}
            <Link href="/dashboard/branding" className="font-extrabold underline">
              Branding
            </Link>
            .
          </p>
        ) : null}

        <form onSubmit={addStaff} className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 text-[13px]"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 text-[13px]"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="sw-btn sw-btn-primary"
            disabled={pending || !data?.staffAllowed}
          >
            {pending ? "Adding…" : "Add member"}
          </button>
        </form>

        <div className="grid gap-2">
          {(data?.staff || []).length === 0 ? (
            <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
              No team members yet. Add someone to appear under Who in the booking calendar.
            </p>
          ) : (
            data?.staff.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--ln)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-extrabold">{s.name}</div>
                  <div className="text-[12px]" style={{ color: "var(--mut)" }}>
                    {s.email || "No email"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <em className={`sw-tag ${s.active ? "sw-tag-ok" : "sw-tag-muted"}`}>
                    {s.active ? "Visible in Who" : "Hidden"}
                  </em>
                  <button
                    type="button"
                    className="sw-btn text-[12.5px]"
                    disabled={busyId === s.id}
                    onClick={() => void patch(s.id, { active: !s.active })}
                  >
                    {s.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="sw-btn text-[12.5px]"
                    disabled={busyId === s.id}
                    onClick={() => {
                      const next = window.prompt("Rename team member", s.name);
                      if (next?.trim()) void patch(s.id, { name: next.trim() });
                    }}
                  >
                    Rename
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
