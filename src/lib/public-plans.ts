import { PlanTier } from "@prisma/client";
import { entitlementsForTier } from "@/lib/plan-entitlements";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export type PublicPlan = {
  tier: string;
  name: string;
  priceMonthly: number;
  priceLabel: string;
  bookingsLimit: number | null;
  staffLimit: number | null;
  themesLimit: number;
  bullets: string[];
  highlighted: boolean;
};

const FALLBACK_PRICE_CENTS: Record<string, number> = {
  FREE: 0,
  PRO: 1500,
  BUSINESS: 3900,
  AGENCY: 9900,
};

const MARKETING_BULLETS: Record<string, string[]> = {
  FREE: [
    "25 bookings / month",
    "1 staff · 2 themes",
    "Email reminders",
    "Webflow embed",
  ],
  PRO: [
    "500 bookings / month",
    "3 staff · 4 themes",
    "Calendar sync + deposits",
    "SMS reminders · analytics",
  ],
  BUSINESS: [
    "Unlimited bookings",
    "15 staff · all 8 themes",
    "AI Calendar Chat",
    "Waitlist · packages · SMS",
  ],
  AGENCY: [
    "Unlimited client sites",
    "White-label ready",
    "Priority support",
    "Everything in Business",
  ],
};

function paidAmountCents(plan: { tier: string; priceMonthly: number }) {
  if (plan.tier === PlanTier.FREE) return 0;
  if (plan.priceMonthly > 0) return plan.priceMonthly;
  return FALLBACK_PRICE_CENTS[plan.tier] ?? 0;
}

function bulletsFor(
  tier: string,
  plan: {
    bookingsLimit: number | null;
    staffLimit: number | null;
    themesLimit: number;
    features: unknown;
  },
) {
  if (Array.isArray(plan.features) && plan.features.every((f) => typeof f === "string")) {
    const human = (plan.features as string[]).filter((f) => f.includes(" ") || f.length > 12);
    if (human.length >= 3) return human.slice(0, 5);
  }

  const e = entitlementsForTier(tier);
  const fromLimits: string[] = [];
  if (plan.bookingsLimit == null) fromLimits.push("Unlimited bookings");
  else fromLimits.push(`${plan.bookingsLimit} bookings / month`);
  if (plan.staffLimit == null) fromLimits.push("Unlimited staff");
  else fromLimits.push(`${plan.staffLimit} staff`);
  fromLimits.push(
    plan.themesLimit >= 8 ? "All 8 themes" : `${plan.themesLimit} themes`,
  );
  if (e.gates.deposits.allowed) fromLimits.push("Stripe deposits");
  if (e.gates.ai_calendar_chat.allowed) fromLimits.push("AI Calendar Chat");
  if (e.gates.waitlist.allowed) fromLimits.push("Waitlist");
  if (fromLimits.length >= 3) return fromLimits.slice(0, 5);

  return MARKETING_BULLETS[tier] || MARKETING_BULLETS.FREE;
}

/** Active plans for the marketing site — live DB prices with safe fallbacks. */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  const fallback: PublicPlan[] = (["FREE", "PRO", "BUSINESS", "AGENCY"] as const).map((tier) => {
    const cents = FALLBACK_PRICE_CENTS[tier] ?? 0;
    const e = entitlementsForTier(tier);
    return {
      tier,
      name: e.label,
      priceMonthly: cents,
      priceLabel: cents <= 0 ? "$0" : formatPrice(cents),
      bookingsLimit: e.bookingsLimit,
      staffLimit: e.staffLimit,
      themesLimit: e.themesLimit,
      bullets: MARKETING_BULLETS[tier],
      highlighted: tier === "PRO",
    };
  });

  try {
    const rows = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: "asc" },
    });
    if (!rows.length) return fallback;

    return rows.map((p) => {
      const amount = paidAmountCents(p);
      return {
        tier: p.tier,
        name: p.name,
        priceMonthly: amount,
        priceLabel: amount <= 0 ? "$0" : formatPrice(amount),
        bookingsLimit: p.bookingsLimit,
        staffLimit: p.staffLimit,
        themesLimit: p.themesLimit,
        bullets: bulletsFor(p.tier, p),
        highlighted: p.tier === PlanTier.PRO,
      };
    });
  } catch {
    return fallback;
  }
}
