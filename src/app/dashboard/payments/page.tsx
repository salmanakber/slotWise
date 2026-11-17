"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Payments = {
  paymentMode: "FULL" | "DEPOSIT" | "PAY_ON_SITE";
  depositPercent: number;
  cancelFreeHours: number;
  noShowFeePercent: number;
  saveCardForNoShow: boolean;
  taxMode: string;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  currency?: string;
};

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <section className="sw-card">
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            Loading payment settings…
          </p>
        </section>
      }
    >
      <PaymentsClient />
    </Suspense>
  );
}

function PaymentsClient() {
  const search = useSearchParams();
  const [form, setForm] = useState<Payments | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [connecting, setConnecting] = useState(false);

  async function load() {
    const r = await fetch("/api/site/payments");
    const d = await r.json();
    if (d.paymentMode) setForm(d);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const s = search.get("stripe");
    if (s === "return") {
      setMsg("Stripe onboarding returned — syncing status…");
      void (async () => {
        await fetch("/api/site/stripe/connect", { credentials: "same-origin" });
        await load();
        setMsg("Stripe status updated.");
      })();
    }
    if (s === "refresh") setMsg("Stripe link expired — click Connect again.");
  }, [search]);

  async function connectStripe() {
    setConnecting(true);
    setMsg("");
    try {
      const res = await fetch("/api/site/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      let data: { url?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Stripe Connect returned an invalid response");
      }
      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 503
              ? "Stripe keys are missing. Add them in Platform → Stripe."
              : res.status === 401
                ? "Sign in again, then retry Connect."
                : "Could not start Stripe Connect"),
        );
      }
      if (!data.url || typeof data.url !== "string") {
        throw new Error("Stripe did not return an onboarding link. Check platform Stripe keys.");
      }
      // Full navigation — Express onboarding must leave the app
      window.location.assign(data.url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Connect failed");
      setConnecting(false);
    }
  }

  async function save() {
    if (!form) return;
    setPending(true);
    setMsg("");
    const res = await fetch("/api/site/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMode: form.paymentMode,
        depositPercent: form.depositPercent,
        cancelFreeHours: form.cancelFreeHours,
        noShowFeePercent: form.noShowFeePercent,
        saveCardForNoShow: form.saveCardForNoShow,
        taxMode: form.taxMode,
      }),
    });
    setPending(false);
    setMsg(res.ok ? "Payment policies saved" : "Could not save");
  }

  if (!form) {
    return (
      <section className="sw-card">
        <p className="text-sm" style={{ color: "var(--mut)" }}>
          Loading payment settings…
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Stripe Connect</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Connect your Stripe account so booking deposits land in your bank. Slotwise platform fee
          defaults to 0%.
        </p>
        <Row label="Account status">
          <em className={`sw-tag ${form.chargesEnabled ? "sw-tag-ok" : "sw-tag-muted"}`}>
            {form.stripeAccountId
              ? form.chargesEnabled
                ? "Charges enabled"
                : "Connected · finish onboarding"
              : "Not connected"}
          </em>
        </Row>
        <Row label="Connect">
          <button
            type="button"
            className="sw-btn sw-btn-primary"
            disabled={connecting}
            onClick={() => void connectStripe()}
          >
            {connecting
              ? "Opening Stripe…"
              : form.stripeAccountId
                ? "Continue / update Stripe"
                : "Connect Stripe account"}
          </button>
        </Row>
        <Row label="Currency">
          <em className="sw-tag sw-tag-muted">{form.currency || "USD"}</em>
        </Row>
        <Row label="Collect payment">
          <select
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            value={form.paymentMode}
            onChange={(e) =>
              setForm({ ...form, paymentMode: e.target.value as Payments["paymentMode"] })
            }
          >
            <option value="FULL">Full amount</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="PAY_ON_SITE">Pay on site</option>
          </select>
        </Row>
        <Row label="Deposit amount">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              className="w-20 rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={form.depositPercent}
              onChange={(e) => setForm({ ...form, depositPercent: Number(e.target.value) })}
              disabled={form.paymentMode !== "DEPOSIT"}
            />
            <span>%</span>
          </div>
        </Row>
      </section>

      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Policies</h2>
        <Row label="Free cancellation until">
          <select
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            value={form.cancelFreeHours}
            onChange={(e) => setForm({ ...form, cancelFreeHours: Number(e.target.value) })}
          >
            {[2, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h} hours
              </option>
            ))}
          </select>
        </Row>
        <Row label="Late-cancel / no-show fee">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              className="w-20 rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={form.noShowFeePercent}
              onChange={(e) => setForm({ ...form, noShowFeePercent: Number(e.target.value) })}
            />
            <span>%</span>
          </div>
        </Row>
        <Toggle
          label="Save card for no-show protection"
          on={form.saveCardForNoShow}
          set={(v) => setForm({ ...form, saveCardForNoShow: v })}
        />
        <Row label="Tax">
          <select
            className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
            value={form.taxMode}
            onChange={(e) => setForm({ ...form, taxMode: e.target.value })}
          >
            <option value="none">None</option>
            <option value="included">Included in price</option>
            <option value="added">Added at checkout</option>
          </select>
        </Row>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" className="sw-btn sw-btn-primary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save payments"}
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
