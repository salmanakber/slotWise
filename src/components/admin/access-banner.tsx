"use client";

import { useSearchParams } from "next/navigation";

export function AccessBanner() {
  const params = useSearchParams();
  if (params.get("error") !== "platform_forbidden") return null;
  return (
    <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--ac)_35%,var(--ln))] bg-[var(--sf)] px-4 py-3 text-sm font-semibold text-[var(--at)]">
      That area is for Slotwise platform operators only. You were redirected to the site dashboard.
    </div>
  );
}
