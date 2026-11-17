"use client";

import { useEffect, useState } from "react";

type Settings = {
  emailConfirm: boolean;
  emailReminderHours: number;
  emailFollowUp: boolean;
  fromEmail: string | null;
  replyToEmail: string | null;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  quietHours: string;
  tone: string;
};

export default function NotificationsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/site/notifications")
      .then((r) => r.json())
      .then((d) => {
        if (d.id || d.emailConfirm !== undefined) {
          setForm({
            ...d,
            fromEmail: d.fromEmail ?? null,
            replyToEmail: d.replyToEmail ?? null,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    if (!form) return;
    setPending(true);
    setMsg("");
    const res = await fetch("/api/site/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setPending(false);
    setMsg(res.ok ? "Notification settings saved" : "Could not save");
  }

  if (!form) {
    return (
      <section className="sw-card">
        <p className="text-sm" style={{ color: "var(--mut)" }}>
          Loading notification settings…
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Email</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          From address must use a domain verified in Resend. Replies go to your inbox via Reply-To.
        </p>
        <Row label="Send from">
          <input
            type="email"
            className="min-w-[220px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            placeholder="bookings@yourdomain.com"
            value={form.fromEmail ?? ""}
            onChange={(e) => setForm({ ...form, fromEmail: e.target.value || null })}
          />
        </Row>
        <Row label="Reply-To (your inbox)">
          <input
            type="email"
            className="min-w-[220px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            placeholder="you@yourdomain.com"
            value={form.replyToEmail ?? ""}
            onChange={(e) => setForm({ ...form, replyToEmail: e.target.value || null })}
          />
        </Row>
        <Toggle
          label="Booking confirmation"
          on={form.emailConfirm}
          set={(v) => setForm({ ...form, emailConfirm: v })}
        />
        <Row label="Reminder">
          <select
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            value={form.emailReminderHours}
            onChange={(e) => setForm({ ...form, emailReminderHours: Number(e.target.value) })}
          >
            {[2, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h} hours before
              </option>
            ))}
          </select>
        </Row>
        <Toggle
          label="Follow-up and review request"
          on={form.emailFollowUp}
          set={(v) => setForm({ ...form, emailFollowUp: v })}
        />
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">SMS and WhatsApp</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Uses platform Twilio credentials when enabled.
        </p>
        <Toggle label="SMS reminders" on={form.smsEnabled} set={(v) => setForm({ ...form, smsEnabled: v })} />
        <Toggle
          label="WhatsApp reminders"
          on={form.whatsappEnabled}
          set={(v) => setForm({ ...form, whatsappEnabled: v })}
        />
        <Row label="Quiet hours">
          <select
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            value={form.quietHours}
            onChange={(e) => setForm({ ...form, quietHours: e.target.value })}
          >
            <option value="Off">Off</option>
            <option value="21:00-08:00">21:00 to 08:00</option>
            <option value="22:00-07:00">22:00 to 07:00</option>
          </select>
        </Row>
        <Row label="Tone">
          <select
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
          >
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="short">Short</option>
          </select>
        </Row>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" className="sw-btn sw-btn-primary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save notifications"}
        </button>
        {msg ? <span className="text-[13px] font-semibold text-[var(--at)]">{msg}</span> : null}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <b>{label}</b>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <b>{label}</b>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => set(!on)}
        className={`relative h-6 w-[42px] rounded-full ${on ? "bg-[var(--ac)]" : "bg-[var(--ln)]"}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition ${
            on ? "translate-x-[18px]" : ""
          }`}
        />
      </button>
    </div>
  );
}
