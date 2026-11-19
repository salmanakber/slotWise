import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { getOwnerSiteOrNull } from "@/lib/site-admin";
import { getSiteBookings, getSiteOverviewStats } from "@/lib/sites";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "PAID" || status === "CONFIRMED" || status === "COMPLETED") return "sw-tag-ok";
  if (status === "CANCELLED" || status === "NO_SHOW") return "sw-tag-bad";
  return "";
}

export default async function DashboardOverviewPage() {
  const site = await getOwnerSiteOrNull();
  const [stats, recentBookings] = site
    ? await Promise.all([
        getSiteOverviewStats(site.id).catch(() => null),
        getSiteBookings(site.id, 40).catch(() => []),
      ])
    : [null, []];
  const currency = site?.currency ?? "USD";

  const kpis = stats
    ? [
        {
          label: "Bookings (7d)",
          value: String(stats.bookingsWeek),
          delta: `${stats.bookingsMonth} this month`,
        },
        {
          label: "Revenue (month)",
          value: formatMoney(stats.revenueMonthCents, currency),
          delta:
            stats.monthDeltaPct === 0
              ? `${formatMoney(stats.revenueWeekCents, currency)} last 7 days`
              : `${stats.monthDeltaPct > 0 ? "+" : ""}${stats.monthDeltaPct}% vs last month`,
          positive: stats.monthDeltaPct >= 0,
        },
        {
          label: "All-time revenue",
          value: formatMoney(stats.revenueCents, currency),
          delta:
            stats.depositCollectedCents > 0
              ? `${formatMoney(stats.depositCollectedCents, currency)} in deposits`
              : `${stats.paid} confirmed / paid`,
        },
        {
          label: "Pipeline",
          value: String(stats.bookingsUpcoming),
          delta: `${stats.bookingsToday} today · ${stats.pending} pending`,
        },
      ]
    : [
        { label: "Bookings (7d)", value: "—", delta: "Connect DB to go live" },
        { label: "Revenue (month)", value: "—", delta: "No sample numbers" },
        { label: "All-time revenue", value: "—", delta: "—" },
        { label: "Pipeline", value: "—", delta: "—" },
      ];

  const maxDay = Math.max(1, ...(stats?.last14Days.map((d) => d.bookings) ?? [1]));
  const maxService = Math.max(1, ...(stats?.topServices.map((s) => s.revenueCents) ?? [1]));

  const today = recentBookings.filter((b) => {
    const d = new Date(b.startsAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate() &&
      b.status !== "CANCELLED"
    );
  });

  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--ln)] bg-[var(--pn)] px-4 py-3 text-sm">
        <span>
          Public booking page:{" "}
          <Link className="font-bold underline" href={`/book/${site?.publicKey ?? DEMO_PUBLIC_KEY}`}>
            /book/{site?.publicKey ?? DEMO_PUBLIC_KEY}
          </Link>
        </span>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/bookings" className="sw-btn">
            All bookings
          </Link>
          <Link href="/dashboard/notifications" className="sw-btn">
            Notifications
          </Link>
          <Link href="/dashboard/ai-chat" className="sw-btn">
            Chat
          </Link>
          <Link href="/dashboard/branding" className="sw-btn sw-btn-primary">
            Style widget
          </Link>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="sw-card">
            <div className="flex items-center justify-between gap-2 text-[13px]" style={{ color: "var(--mut)" }}>
              <span>{k.label}</span>
              {stats ? (
                <em className="sw-tag sw-tag-ok !text-[10px] !normal-case !tracking-normal">Live</em>
              ) : null}
            </div>
            <div className="text-[29px] font-extrabold leading-tight">{k.value}</div>
            <div
              className="text-[12.5px] font-bold"
              style={{
                color:
                  "positive" in k && k.positive === false ? "var(--at, #c0392b)" : "var(--ok)",
              }}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-5">
        <section className="sw-card lg:col-span-3">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="m-0 text-[15px] font-extrabold">Booking activity</h2>
              <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: "var(--mut)" }}>
                Last 14 days · by booking created
              </p>
            </div>
            {stats ? (
              <div className="text-right text-[12.5px] font-semibold" style={{ color: "var(--mut)" }}>
                {stats.bookingsWeek} in 7d · {formatMoney(stats.revenueWeekCents, currency)}
              </div>
            ) : null}
          </div>
          {stats && stats.last14Days.some((d) => d.bookings > 0) ? (
            <div className="flex h-36 items-end gap-1.5">
              {stats.last14Days.map((d) => (
                <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-[var(--ac)] opacity-90"
                    style={{ height: `${Math.max(6, (d.bookings / maxDay) * 100)}%` }}
                    title={`${d.label}: ${d.bookings} bookings · ${formatMoney(d.revenueCents, currency)}`}
                  />
                  <span className="truncate text-[10px] font-semibold" style={{ color: "var(--mut)" }}>
                    {d.label.split(" ")[1] ?? d.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-sm" style={{ color: "var(--mut)" }}>
              No booking activity yet. Once appointments come in, this chart fills in.
            </p>
          )}
        </section>

        <section className="sw-card lg:col-span-2">
          <h2 className="mb-1 text-[15px] font-extrabold">Revenue by service</h2>
          <p className="mb-3 mt-0 text-[12.5px]" style={{ color: "var(--mut)" }}>
            Top earners from confirmed / paid bookings
          </p>
          {stats && stats.topServices.length > 0 ? (
            <ul className="m-0 grid list-none gap-3 p-0">
              {stats.topServices.map((s) => (
                <li key={s.serviceId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate font-semibold">{s.name}</span>
                    <span className="shrink-0 font-extrabold">
                      {formatMoney(s.revenueCents, currency)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ln)]">
                    <div
                      className="h-full rounded-full bg-[var(--ac)]"
                      style={{ width: `${(s.revenueCents / maxService) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11.5px] font-semibold" style={{ color: "var(--mut)" }}>
                    {s.count} booking{s.count === 1 ? "" : "s"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm" style={{ color: "var(--mut)" }}>
              Revenue by service appears after paid or confirmed bookings.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="sw-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="m-0 text-[15px] font-extrabold">Today</h2>
            {stats ? (
              <em className="sw-tag sw-tag-muted">{stats.bookingsToday} scheduled</em>
            ) : null}
          </div>
          {today.length === 0 ? (
            <p className="m-0 text-sm" style={{ color: "var(--mut)" }}>
              No bookings today yet. Share your booking link to get the first one.
            </p>
          ) : (
            today.map((row) => (
              <div key={row.id} className="flex items-center gap-3 border-t border-[var(--ln)] py-2.5">
                <time className="w-14 font-extrabold">
                  {new Date(row.startsAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{row.customerName}</div>
                  <div className="truncate text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {row.service.name}
                    {row.staff.length
                      ? ` · ${row.staff.map((s) => s.staff.name).join(", ")}`
                      : ""}
                    {row.meetingProvider === "zoom"
                      ? " · Zoom"
                      : row.meetingProvider === "meet"
                        ? " · Meet"
                        : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {row.meetingUrl ? (
                    <a
                      href={row.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-1 block text-[11.5px] font-extrabold underline"
                      style={{ color: "var(--ac)" }}
                    >
                      Join {row.meetingProvider === "zoom" ? "Zoom" : "Meet"}
                    </a>
                  ) : null}
                  <div className="text-[12.5px] font-extrabold">
                    {formatMoney(row.amountCents, row.currency)}
                  </div>
                  <em className={`sw-tag ${statusClass(row.status)}`}>{row.status}</em>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="sw-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="m-0 text-[15px] font-extrabold">Coming up</h2>
            <Link href="/dashboard/bookings" className="text-[12.5px] font-bold underline">
              View all
            </Link>
          </div>
          {stats && stats.upcoming.length > 0 ? (
            stats.upcoming.map((row) => (
              <div key={row.id} className="flex items-center gap-3 border-t border-[var(--ln)] py-2.5">
                <div className="w-[4.5rem] shrink-0">
                  <div className="text-[12.5px] font-extrabold">
                    {new Date(row.startsAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-[11.5px]" style={{ color: "var(--mut)" }}>
                    {new Date(row.startsAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{row.customerName}</div>
                  <div className="truncate text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {row.service.name}
                    {row.meetingProvider === "zoom"
                      ? " · Zoom"
                      : row.meetingProvider === "meet"
                        ? " · Meet"
                        : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {row.meetingUrl ? (
                    <a
                      href={row.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-1 block text-[11.5px] font-extrabold underline"
                      style={{ color: "var(--ac)" }}
                    >
                      Join
                    </a>
                  ) : null}
                  <em className={`sw-tag ${statusClass(row.status)}`}>{row.status}</em>
                </div>
              </div>
            ))
          ) : (
            <p className="m-0 text-sm" style={{ color: "var(--mut)" }}>
              Nothing scheduled in the next 7 days.
            </p>
          )}

          {stats ? (
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--ln)] pt-3 text-center">
              {[
                { label: "Pending", value: stats.pending },
                { label: "Cancelled", value: stats.cancelled },
                { label: "No-show", value: `${stats.noShowRate}%` },
              ].map((x) => (
                <div key={x.label} className="rounded-lg bg-[var(--bg)] px-2 py-2">
                  <div className="text-[16px] font-extrabold">{x.value}</div>
                  <div className="text-[11px] font-semibold" style={{ color: "var(--mut)" }}>
                    {x.label}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
