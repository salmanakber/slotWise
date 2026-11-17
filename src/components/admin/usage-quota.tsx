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
      <div className="hidden min-w-[200px] animate-pulse rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3 py-2 sm:block">
        <div className="h-3 w-28 rounded bg-[var(--ln)]" />
        <div className="mt-2 h-2 w-full rounded bg-[var(--ln)]" />
      </div>
    );
  }

  const b = usage.bookings;
  const pct =
    b.limit == null ? 12 : Math.min(100, Math.round((b.used / Math.max(b.limit, 1)) * 100));
  const barColor = b.atLimit
    ? "#c0392b"
    : b.nearlyFull
      ? "var(--ac)"
      : "var(--ok, #178a58)";

  return (
    <div
      className="min-w-[210px] max-w-[280px] rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,.03)]"
      title={`${usage.siteName} · ${usage.planLabel}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--mut)" }}>
          This month
        </span>
        <span className="rounded-full bg-[var(--sf)] px-2 py-0.5 text-[10px] font-bold text-[var(--at)]">
          {usage.planLabel}
        </span>
      </div>
      <div className="mt-1 text-[13px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}>
        {b.limit == null ? (
          <>
            <span className="text-[var(--ink)]">{b.used}</span>
            <span className="ml-1 text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
              bookings
            </span>
          </>
        ) : (
          <>
            <span className={b.atLimit ? "text-[#c0392b]" : "text-[var(--ink)]"}>{b.used}</span>
            <span className="text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
              {" "}
              / {b.limit} bookings
            </span>
          </>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ln)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold" style={{ color: "var(--mut)" }}>
        <span>{usage.events.label}</span>
        {b.atLimit || b.nearlyFull ? (
          <Link href="/dashboard/plans" className="font-bold text-[var(--at)] underline-offset-2 hover:underline">
            Upgrade
          </Link>
        ) : b.remaining != null ? (
          <span>{b.remaining} left</span>
        ) : (
          <span>Unlimited</span>
        )}
      </div>
    </div>
  );
}
