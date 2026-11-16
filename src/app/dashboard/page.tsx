import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { getDemoSite, getSiteOverviewStats } from "@/lib/sites";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const site = await getDemoSite();
  const stats = site
    ? await getSiteOverviewStats(site.id).catch(() => null)
    : null;

  const kpis = [
    {
      label: "Bookings (7d)",
      value: stats ? String(stats.bookingsWeek) : "196",
      delta: site ? "Live from Postgres" : "Sample · seed DB to go live",
    },
    {
      label: "Revenue",
      value: formatMoney(stats?.revenueCents ?? 1984000),
      delta: "+ tracked bookings",
    },
    {
      label: "Confirmed / paid",
      value: String(stats?.paid ?? 74),
      delta: "Excludes cancelled",
    },
    {
      label: "No-show rate",
      value: `${stats?.noShowRate ?? 2.6}%`,
      delta: "Deposits help lower this",
    },
  ];

  const today = site?.bookings.filter((b) => {
    const d = new Date(b.startsAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate() &&
      b.status !== "CANCELLED"
    );
  }) ?? [];

  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--ln)] bg-[var(--pn)] px-4 py-3 text-sm">
        <span>
          Public booking page:{" "}
          <Link className="font-bold underline" href={`/book/${site?.publicKey ?? DEMO_PUBLIC_KEY}`}>
            /book/{site?.publicKey ?? DEMO_PUBLIC_KEY}
          </Link>
        </span>
        <Link href="/dashboard/branding" className="sw-btn sw-btn-primary">
          Style widget
        </Link>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="sw-card">
            <div className="text-[13px]" style={{ color: "var(--mut)" }}>
              {k.label}
            </div>
            <div className="text-[29px] font-extrabold leading-tight">{k.value}</div>
            <div className="text-[12.5px] font-bold" style={{ color: "var(--ok)" }}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Today</h2>
          {today.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--mut)" }}>
              No bookings today yet. Share your booking link to get the first one.
            </p>
          ) : (
            today.map((row) => (
              <div key={row.id} className="flex items-center gap-3 border-t border-[var(--ln)] py-2.5">
                <time className="w-14 font-extrabold">
                  {new Date(row.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
                <div className="flex-1">
                  <div className="font-semibold">{row.customerName}</div>
                  <div className="text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {row.service.name}
                  </div>
                </div>
                <em className={`sw-tag ${row.status === "PAID" || row.status === "CONFIRMED" ? "sw-tag-ok" : ""}`}>
                  {row.status}
                </em>
              </div>
            ))
          )}
        </section>

        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Operator tips</h2>
          <ul className="m-0 list-disc space-y-2 pl-5 text-sm" style={{ color: "var(--mut)" }}>
            <li>Require a deposit on high-demand services — no-show rate usually drops fast.</li>
            <li>Keep buffer after jobs so travel / cleanup never double-books.</li>
            <li>Use the brand loader while slots load — it feels faster than a blank calendar.</li>
            <li>Install via Webflow Custom Code (not paste) so uninstall can clean up.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
