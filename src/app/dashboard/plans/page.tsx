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
  requiresCheckout?: boolean;
  hasCheckout?: boolean;
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

function needsStripe(p: PlanCard) {
  if (p.tier === "FREE") return false;
  if (typeof p.requiresCheckout === "boolean") return p.requiresCheckout;
  return p.priceMonthly > 0;
}

function PlansInner() {
  const search = useSearchParams();
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [currentTier, setCurrentTier] = useState("FREE");
  const [stripeReady, setStripeReady] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/site/plan", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Could not load plans");
      return;
    }
    setPlans(json.plans || []);
    setCurrentTier(json.currentTier || "FREE");
    setStripeReady(json.stripeReady !== false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const canceled = search.get("canceled");
    const checkout = search.get("checkout");
    const sessionId = search.get("session_id");
    const upgraded = search.get("upgraded");

    if (canceled) {
      setMsg("Checkout canceled — your plan was not changed.");
      return;
    }

    if (checkout === "success" && sessionId) {
      setMsg("Confirming payment…");
      void (async () => {
        try {
          const res = await fetch("/api/site/plan/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Could not confirm payment");
          setCurrentTier(json.tier || currentTier);
          setMsg(`You're now on ${json.label || json.tier}. Limits apply immediately.`);
          await load();
          // Clean query string without reload
          window.history.replaceState({}, "", "/dashboard/plans");
        } catch (e) {
          setMsg(
            e instanceof Error
              ? e.message
              : "Payment received but plan confirm failed — refresh in a moment.",
          );
        }
      })();
      return;
    }

    if (upgraded) {
      setMsg(`You're now on ${upgraded}. Limits apply immediately.`);
      void load();
    }
  }, [search, load, currentTier]);

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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Upgrade failed");
      }

      // Paid plans MUST redirect to Stripe — never treat as applied
      if (json.checkoutUrl && typeof json.checkoutUrl === "string") {
        setMsg("Redirecting to Stripe Checkout…");
        window.location.assign(json.checkoutUrl);
        return;
      }

      if (tier !== "FREE" && (json.requiresCheckout || needsStripe({ tier, priceMonthly: 1 } as PlanCard))) {
        throw new Error(
          json.error ||
            "Stripe Checkout URL missing. Add Platform → Stripe secret key, then try again.",
        );
      }

      if (json.applied || json.unchanged) {
        setCurrentTier(json.tier || tier);
        setMsg(
          json.unchanged
            ? `Already on ${json.tier || tier}.`
            : `Plan updated to ${json.label || tier}.`,
        );
        await load();
        return;
      }

      throw new Error("Unexpected response — plan was not changed.");
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
            requiresCheckout: tier !== "FREE",
          } satisfies PlanCard;
        });

  return (
    <div className="grid gap-3.5">
      {!stripeReady ? (
        <div className="rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3.5 py-3 text-[13px] font-semibold text-[var(--bad)]">
          Stripe keys are missing. Paid upgrades cannot start until Platform → Stripe has a secret
          key.
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3.5 py-3 text-[13px] font-semibold">
          {msg}
        </div>
      ) : null}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((p) => {
          const current = p.tier === currentTier;
          const paid = needsStripe(p);
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
              {paid && !current ? (
                <p className="m-0 text-[11.5px] font-semibold" style={{ color: "var(--mut)" }}>
                  Opens Stripe Checkout — plan unlocks after payment.
                </p>
              ) : null}
              <button
                type="button"
                className={`sw-btn ${current ? "" : "sw-btn-primary"}`}
                disabled={current || busy === p.tier || (paid && !stripeReady)}
                onClick={() => void choose(p.tier)}
              >
                {busy === p.tier
                  ? paid
                    ? "Opening Stripe…"
                    : "Working…"
                  : current
                    ? "Current plan"
                    : paid
                      ? "Upgrade with Stripe"
                      : "Switch to Free"}
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
