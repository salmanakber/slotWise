"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatPrice } from "@/lib/utils";
import { entitlementsForTier } from "@/lib/plan-entitlements";

type PlanCard = {
  id: string;
  tier: string;
  name: string;
  priceMonthly: number;
  bookingsLimit: number | null;
  staffLimit: number | null;
  themesLimit: number;
  features: unknown;
  hasCheckout: boolean;
};

const FALLBACK_FEATURES: Record<string, string[]> = {
  FREE: ["1 staff, 1 location", "25 bookings a month", "Email reminders", "2 themes"],
  PRO: ["500 bookings a month", "3 staff", "Calendar sync", "4 themes"],
  BUSINESS: ["15 staff, multi-location", "Unlimited bookings", "Packages and waitlist", "All 8 themes"],
  AGENCY: ["Unlimited client sites", "White-label", "Priority support", "Custom themes"],
};

function featureList(p: PlanCard): string[] {
  if (Array.isArray(p.features) && p.features.every((f) => typeof f === "string") && p.features.length) {
    return p.features as string[];
  }
  return FALLBACK_FEATURES[p.tier] || [];
}

function PlansInner() {
  const search = useSearchParams();
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [currentTier, setCurrentTier] = useState("FREE");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/site/plan");
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Could not load plans");
      return;
    }
    setPlans(json.plans || []);
    setCurrentTier(json.currentTier || "FREE");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const upgraded = search.get("upgraded");
    const canceled = search.get("canceled");
    if (upgraded) setMsg(`You're now on ${upgraded}. Limits apply immediately.`);
    if (canceled) setMsg("Checkout canceled — your plan was not changed.");
  }, [search]);

  async function choose(tier: string) {
    if (tier === currentTier || busy) return;
    setBusy(tier);
    setMsg("");
    try {
      const res = await fetch("/api/site/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upgrade failed");
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }
      setCurrentTier(json.tier || tier);
      setMsg(`Plan updated to ${json.label || tier}. Booking limits now use this plan.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upgrade failed");
    } finally {
      setBusy(null);
    }
  }

  const cards =
    plans.length > 0
      ? plans
      : (["FREE", "PRO", "BUSINESS", "AGENCY"] as const).map((tier) => {
          const e = entitlementsForTier(tier);
          return {
            id: tier,
            tier,
            name: e.label,
            priceMonthly:
              tier === "FREE" ? 0 : tier === "PRO" ? 1500 : tier === "BUSINESS" ? 3900 : 9900,
            bookingsLimit: e.bookingsLimit,
            staffLimit: e.staffLimit,
            themesLimit: e.themesLimit,
            features: FALLBACK_FEATURES[tier],
            hasCheckout: false,
          } satisfies PlanCard;
        });

  return (
    <div className="grid gap-3.5">
      {msg ? (
        <div className="rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3.5 py-3 text-[13px] font-semibold">
          {msg}
        </div>
      ) : null}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((p) => {
          const current = p.tier === currentTier;
          return (
            <section
              key={p.tier}
              className={`sw-card flex flex-col gap-2.5 ${current ? "shadow-[0_0_0_2px_var(--ac)]" : ""}`}
            >
              <h2 className="m-0 text-[15px] font-extrabold">
                {p.name}
                {current ? <em className="sw-tag sw-tag-ok ml-2">Current</em> : null}
              </h2>
              <div className="text-[28px] font-extrabold">
                {formatPrice(p.priceMonthly)}
                <small className="text-[13px] font-semibold" style={{ color: "var(--mut)" }}>
                  {" "}
                  a month
                </small>
              </div>
              <ul
                className="m-0 flex-1 list-disc pl-[18px] text-[13.5px]"
                style={{ color: "var(--mut)" }}
              >
                {featureList(p).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`sw-btn ${current ? "" : "sw-btn-primary"}`}
                disabled={current || busy === p.tier}
                onClick={() => void choose(p.tier)}
              >
                {busy === p.tier
                  ? p.priceMonthly > 0
                    ? "Opening Stripe…"
                    : "Working…"
                  : current
                    ? "Current plan"
                    : p.priceMonthly === 0
                      ? "Switch to Free"
                      : "Upgrade with Stripe"}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <section className="sw-card">
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            Loading plans…
          </p>
        </section>
      }
    >
      <PlansInner />
    </Suspense>
  );
}
