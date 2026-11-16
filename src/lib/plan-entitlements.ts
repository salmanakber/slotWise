import { PlanTier } from "@prisma/client";

export type EntitlementKey =
  | "events"
  | "ai_descriptions"
  | "import_export"
  | "categories"
  | "featured_events"
  | "buffers"
  | "capacity"
  | "online_location"
  | "canvas_embed"
  | "publish"
  | "analytics"
  | "staff"
  | "waitlist"
  | "deposits"
  | "themes"
  | "sms";

type TierLimits = {
  eventsLimit: number | null;
  staffLimit: number | null;
  themesLimit: number;
  features: EntitlementKey[];
  upgradeTo: PlanTier;
  label: string;
  priceLabel: string;
};

const ALL_FEATURES: EntitlementKey[] = [
  "events",
  "ai_descriptions",
  "import_export",
  "categories",
  "featured_events",
  "buffers",
  "capacity",
  "online_location",
  "canvas_embed",
  "publish",
  "analytics",
  "staff",
  "waitlist",
  "deposits",
  "themes",
  "sms",
];

const TIER: Record<PlanTier, TierLimits> = {
  FREE: {
    eventsLimit: 3,
    staffLimit: 1,
    themesLimit: 2,
    features: ["events", "canvas_embed", "publish", "themes"],
    upgradeTo: PlanTier.PRO,
    label: "Free",
    priceLabel: "$0",
  },
  PRO: {
    eventsLimit: 25,
    staffLimit: 3,
    themesLimit: 4,
    features: [
      "events",
      "canvas_embed",
      "publish",
      "themes",
      "ai_descriptions",
      "import_export",
      "categories",
      "buffers",
      "deposits",
      "analytics",
      "staff",
      "online_location",
    ],
    upgradeTo: PlanTier.BUSINESS,
    label: "Pro",
    priceLabel: "$15/mo",
  },
  BUSINESS: {
    eventsLimit: null,
    staffLimit: 15,
    themesLimit: 8,
    features: [
      "events",
      "canvas_embed",
      "publish",
      "themes",
      "ai_descriptions",
      "import_export",
      "categories",
      "featured_events",
      "buffers",
      "capacity",
      "online_location",
      "deposits",
      "analytics",
      "staff",
      "waitlist",
    ],
    upgradeTo: PlanTier.AGENCY,
    label: "Business",
    priceLabel: "$39/mo",
  },
  AGENCY: {
    eventsLimit: null,
    staffLimit: null,
    themesLimit: 8,
    features: [...ALL_FEATURES],
    upgradeTo: PlanTier.AGENCY,
    label: "Agency",
    priceLabel: "$99/mo",
  },
};

export function entitlementsForTier(tier: PlanTier | string | null | undefined) {
  const key = (tier as PlanTier) in TIER ? (tier as PlanTier) : PlanTier.FREE;
  const cfg = TIER[key];
  const allowed = new Set(cfg.features);
  const gates = Object.fromEntries(
    ALL_FEATURES.map((f) => [
      f,
      {
        allowed: allowed.has(f),
        upgradeTo: cfg.upgradeTo,
        upgradeLabel: TIER[cfg.upgradeTo].label,
      },
    ]),
  ) as Record<
    EntitlementKey,
    { allowed: boolean; upgradeTo: PlanTier; upgradeLabel: string }
  >;

  return {
    tier: key,
    label: cfg.label,
    priceLabel: cfg.priceLabel,
    eventsLimit: cfg.eventsLimit,
    staffLimit: cfg.staffLimit,
    themesLimit: cfg.themesLimit,
    upgradeTo: cfg.upgradeTo,
    upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://slotwise.hindaralabs.com"}/dashboard/plans`,
    gates,
  };
}

export function canUse(tier: PlanTier | string | null | undefined, feature: EntitlementKey) {
  return entitlementsForTier(tier).gates[feature].allowed;
}
