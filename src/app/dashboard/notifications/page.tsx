"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  emailConfirm: boolean;
  ownerEmailAlert: boolean;
  emailReminderHours: number;
  emailFollowUp: boolean;
  fromEmail: string | null;
  replyToEmail: string | null;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  quietHours: string;
  tone: string;
};

type InboxItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  meta?: unknown;
};

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function typeTone(type: string) {
  if (type.startsWith("booking")) return "var(--ac)";
  if (type === "meeting") return "#2f80ed";
  if (type === "chat") return "#7c5cff";
  if (type === "payment") return "var(--ok)";
  return "var(--mut)";
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<"inbox" | "settings">("inbox");
  const [form, setForm] = useState<Settings | null>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  const loadInbox = useCallback(async () => {
    const res = await fetch("/api/site/inbox", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setItems(json.items || []);
      setUnread(json.unread || 0);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
    fetch("/api/site/notifications")
      .then((r) => r.json())
      .then((d) => {
        if (d.id || d.emailConfirm !== undefined) {
          setForm({
            ...d,
            ownerEmailAlert: d.ownerEmailAlert !== false,
            fromEmail: d.fromEmail ?? null,
            replyToEmail: d.replyToEmail ?? null,
          });
        }
      })
      .catch(() => undefined);
  }, [loadInbox]);

  async function markAllRead() {
    const res = await fetch("/api/site/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const json = await res.json();
    if (res.ok) {
      setItems(json.items || []);
      setUnread(json.unread || 0);
    }
  }

  async function markOne(id: string) {
    const res = await fetch("/api/site/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    const json = await res.json();
    if (res.ok) {
      setItems(json.items || []);
      setUnread(json.unread || 0);
    }
  }

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

  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`sw-btn ${tab === "inbox" ? "sw-btn-primary" : ""}`}
          onClick={() => setTab("inbox")}
        >
          Inbox{unread ? ` · ${unread}` : ""}
        </button>
        <button
          type="button"
          className={`sw-btn ${tab === "settings" ? "sw-btn-primary" : ""}`}
          onClick={() => setTab("settings")}
        >
          Delivery settings
        </button>
      </div>

      {tab === "inbox" ? (
        <section className="sw-card">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="m-0 text-[15px] font-extrabold">Activity inbox</h2>
              <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--mut)" }}>
                Bookings, meetings, and chat signals for this site
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="sw-btn text-[12px]" onClick={() => void loadInbox()}>
                Refresh
              </button>
              <button
                type="button"
                className="sw-btn text-[12px]"
                disabled={!unread}
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            {items.length ? (
              items.map((n) => (
                <article
                  key={n.id}
                  className="rounded-xl border border-[var(--ln)] px-3.5 py-3"
                  style={{
                    background: n.readAt
                      ? "transparent"
                      : "color-mix(in srgb, var(--ac) 7%, var(--pn))",
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em]"
                          style={{
                            color: typeTone(n.type),
                            background: `color-mix(in srgb, ${typeTone(n.type)} 14%, transparent)`,
                          }}
                        >
                          {n.type.replace(".", " · ")}
                        </span>
                        {!n.readAt ? (
                          <em className="sw-tag sw-tag-ok !normal-case !tracking-normal">New</em>
                        ) : null}
                      </div>
                      <h3 className="m-0 mt-1.5 text-[13.5px] font-extrabold">{n.title}</h3>
                      <p className="mb-0 mt-1 text-[12.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
                        {n.body}
                      </p>
                      <div className="mt-1.5 text-[11px]" style={{ color: "var(--mut)" }}>
                        {fmtWhen(n.createdAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      {n.href ? (
                        <Link href={n.href} className="sw-btn text-[12px]" onClick={() => void markOne(n.id)}>
                          Open
                        </Link>
                      ) : null}
                      {!n.readAt ? (
                        <button
                          type="button"
                          className="sw-btn text-[12px]"
                          onClick={() => void markOne(n.id)}
                        >
                          Read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
                No notifications yet — new bookings and meeting links will show up here.
              </p>
            )}
          </div>
        </section>
      ) : !form ? (
        <section className="sw-card">
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            Loading notification settings…
          </p>
        </section>
      ) : (
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
              label="Booking confirmation emails"
              checked={form.emailConfirm}
              onChange={(v) => setForm({ ...form, emailConfirm: v })}
            />
            <Toggle
              label="Email me on new bookings"
              checked={form.ownerEmailAlert}
              onChange={(v) => setForm({ ...form, ownerEmailAlert: v })}
            />
            <Toggle
              label="Follow-up emails"
              checked={form.emailFollowUp}
              onChange={(v) => setForm({ ...form, emailFollowUp: v })}
            />
            <Row label="Reminder hours before">
              <input
                type="number"
                min={1}
                max={168}
                className="w-24 rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.emailReminderHours}
                onChange={(e) =>
                  setForm({ ...form, emailReminderHours: Number(e.target.value) || 24 })
                }
              />
            </Row>
          </section>

          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">SMS & WhatsApp</h2>
            <p className="mb-3 mt-0 text-[12.5px]" style={{ color: "var(--mut)" }}>
              Sent right after a booking when the customer left a phone number. SMS uses Twilio; WhatsApp
              uses the platform provider (Twilio, Meta Cloud API, or OpenWA) under Platform → Providers.
              Plan must allow SMS.
            </p>
            <Toggle
              label="SMS confirmation"
              checked={form.smsEnabled}
              onChange={(v) => setForm({ ...form, smsEnabled: v })}
            />
            <Toggle
              label="WhatsApp confirmation"
              checked={form.whatsappEnabled}
              onChange={(v) => setForm({ ...form, whatsappEnabled: v })}
            />
            <Row label="Quiet hours">
              <input
                className="min-w-[160px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.quietHours}
                onChange={(e) => setForm({ ...form, quietHours: e.target.value })}
              />
            </Row>
            <Row label="Tone">
              <select
                className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
              >
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="short">Short</option>
              </select>
            </Row>
            <button type="button" className="sw-btn sw-btn-primary mt-3" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save notifications"}
            </button>
            {msg ? <p className="mt-2 mb-0 text-[13px] font-semibold text-[var(--at)]">{msg}</p> : null}
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <b className="text-[13px]">{label}</b>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <b className="text-[13px]">{label}</b>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-[42px] rounded-full ${checked ? "bg-[var(--ac)]" : "bg-[var(--ln)]"}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition ${
            checked ? "translate-x-[18px]" : ""
          }`}
        />
      </button>
    </div>
  );
}
