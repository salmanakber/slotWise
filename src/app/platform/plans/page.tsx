import { prisma } from "@/lib/prisma";
import { PlanEditor } from "./plan-editor";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { tier: "FREE", name: "Free", priceMonthly: 0, bookingsLimit: 25, staffLimit: 1, sitesLimit: 1, themesLimit: 2 },
  { tier: "PRO", name: "Pro", priceMonthly: 1500, bookingsLimit: 500, staffLimit: 3, sitesLimit: 1, themesLimit: 4 },
  { tier: "BUSINESS", name: "Business", priceMonthly: 3900, bookingsLimit: null, staffLimit: 15, sitesLimit: 3, themesLimit: 8 },
  { tier: "AGENCY", name: "Agency", priceMonthly: 9900, bookingsLimit: null, staffLimit: null, sitesLimit: null, themesLimit: 8 },
];

async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });
    if (!plans.length) return FALLBACK;
    return plans.map((p) => ({
      tier: p.tier,
      name: p.name,
      priceMonthly: p.priceMonthly,
      bookingsLimit: p.bookingsLimit,
      staffLimit: p.staffLimit,
      sitesLimit: p.sitesLimit,
      themesLimit: p.themesLimit,
    }));
  } catch {
    return FALLBACK;
  }
}

export default async function PlatformPlansPage() {
  const plans = await getPlans();

  return (
    <div className="grid gap-3.5">
      <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
        Edit list prices and limits here. Stripe price IDs can be attached later without changing the UX.
        Use 0 for unlimited seats / bookings / sites.
      </p>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <PlanEditor key={p.tier} plan={p} />
        ))}
      </div>
    </div>
  );
}
