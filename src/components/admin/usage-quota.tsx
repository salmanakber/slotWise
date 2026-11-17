"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Usage = {
  siteName: string;
  planLabel: string;
  bookings: {
    used: number;
    limit: number | null;
    total: number;
    label: string;
    remaining: number | null;
    nearlyFull: boolean;
    atLimit: boolean;
  };
  events: {
    used: number;
    limit: number | null;
    label: string;
    atLimit: boolean;
  };
  upgradeUrl: string;
};

export function UsageQuota() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/site/usage")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.bookings) setUsage(d as Usage);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage) {
    return (
      <div className="hidden h-9 w-[168px] animate-pulse rounded-full bg-[var(--ln)] sm:block" />
    );
  }

  const b = usage.bookings;
  const pct =
    b.limit == null ? 8 : Math.min(100, Math.round((b.used / Math.max(b.limit, 1)) * 100));
  const barColor = b.atLimit ? "var(--bad, #c0392b)" : b.nearlyFull ? "var(--ac)" : "var(--ok)";
  const countLabel =
    b.limit == null ? `${b.used} bookings` : `${b.used} / ${b.limit}`;

  return (
    <div
      className="flex max-w-full items-center gap-2.5 rounded-full border border-[var(--ln)] bg-[var(--pn)] py-1.5 pl-3 pr-1.5"
      title={`${usage.siteName} · ${b.label}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-extrabold tabular-nums tracking-tight">{countLabel}</span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em]"
            style={{ background: "var(--sf)", color: "var(--at)" }}
          >
            {usage.planLabel}
          </span>
        </div>
        <div className="mt-1 h-1 w-[88px] overflow-hidden rounded-full bg-[var(--ln)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>
      {b.atLimit || b.nearlyFull ? (
        <Link
          href="/dashboard/plans"
          className="shrink-0 rounded-full bg-[var(--ac)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--on)]"
        >
          Upgrade
        </Link>
      ) : (
        <span
          className="shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold"
          style={{ color: "var(--mut)" }}
        >
          {b.remaining != null ? `${b.remaining} left` : "Unlimited"}
        </span>
      )}
    </div>
  );
}
