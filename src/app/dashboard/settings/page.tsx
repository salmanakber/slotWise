"use client";

import { FormEvent, useEffect, useState } from "react";
import { CONTACT_EMAIL } from "@/lib/brand";

const inputClass =
  "min-w-[220px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [locale, setLocale] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [publicKey, setPublicKey] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/site/settings")
      .then((r) => r.json())
      .then((d) => {
        if (!d.name) return;
        setName(d.name);
        setBusinessName(d.businessName || d.name);
        setTimezone(d.timezone);
        setLocale(d.locale);
        setCurrency(d.currency);
        setPublicKey(d.publicKey);
      })
      .catch(() => undefined);
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg("");
    const res = await fetch("/api/site/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, businessName, timezone, locale, currency }),
    });
    setPending(false);
    setMsg(res.ok ? "Settings saved" : "Could not save");
  }

  return (
    <form onSubmit={save} className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Business</h2>
        <Field label="Site name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Widget business name">
          <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </Field>
        <Field label="Time zone">
          <select className={inputClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {[
              "UTC",
              "America/New_York",
              "America/Los_Angeles",
              "Europe/London",
              "Asia/Dubai",
              "Asia/Karachi",
              "Asia/Singapore",
            ].map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select className={inputClass} value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </Field>
        <Field label="Currency">
          <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {["USD", "EUR", "GBP", "AED", "PKR"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        {publicKey ? (
          <Field label="Public site key">
            <code className="text-sm font-semibold">{publicKey}</code>
          </Field>
        ) : null}
      </section>

      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Support</h2>
        <Field label="Slotwise contact">
          <a className="font-semibold text-[var(--at)] underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="sw-btn sw-btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg ? <span className="text-[13px] font-semibold text-[var(--at)]">{msg}</span> : null}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <b>{label}</b>
      <div>{children}</div>
    </div>
  );
}
