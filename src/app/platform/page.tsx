import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [activeSites, totalSites, flags] = await Promise.all([
      prisma.site.count({ where: { status: "ACTIVE" } }),
      prisma.site.count(),
      prisma.featureFlag.count({ where: { enabled: true } }),
    ]);
    return { activeSites, totalSites, flags, live: true as const };
  } catch {
    return { activeSites: 4, totalSites: 6, flags: 14, live: false as const };
  }
}

export default async function PlatformActivityPage() {
  const stats = await getStats();

  return (
    <div className="grid gap-3.5">
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--ac)_28%,var(--ln))] bg-[var(--sf)] px-3.5 py-3 text-[13px] text-[var(--at)]">
        This console is for Slotwise owners only — not visible to site customers. Use it to watch installs, pause
        abusive sites, edit plans, and control Stripe / feature rollout.
        {!stats.live ? " Showing sample metrics until the database is connected." : null}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active sites", String(stats.activeSites), `${stats.totalSites} total`],
          ["Feature flags on", String(stats.flags), "P0–P2 controlled"],
          ["MRR", "$69", "Demo until Stripe sync"],
          ["Failed payments", "7", "Needs review"],
        ].map(([label, value, delta]) => (
          <div key={label} className="sw-card">
            <div className="text-[13px]" style={{ color: "var(--mut)" }}>
              {label}
            </div>
            <div className="text-[29px] font-extrabold leading-tight">{value}</div>
            <div className="text-[12.5px] font-bold" style={{ color: "var(--ok)" }}>
              {delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Live activity</h2>
          {[
            ["2m", "Studio Nine published widget v1.4.2", "ok"],
            ["11m", "Northwind Clean hit 1,000 bookings this month", "ok"],
            ["28m", "Tutorly upgraded Free → Pro", "ok"],
            ["1h", "Lens & Light paused by agency owner", "mu"],
            ["3h", "Clinic One suspended · Stripe invoice unpaid", "bad"],
          ].map(([t, text, tone]) => (
            <div key={String(t)} className="flex items-center gap-3 border-t border-[var(--ln)] py-2.5">
              <time className="w-9 font-extrabold">{t}</time>
              <span className="flex-1">{text}</span>
              <em className={`sw-tag ${tone === "ok" ? "sw-tag-ok" : tone === "bad" ? "sw-tag-bad" : "sw-tag-muted"}`}>
                {tone === "ok" ? "Live" : tone === "bad" ? "Alert" : "Info"}
              </em>
            </div>
          ))}
        </section>

        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Health</h2>
          {[
            ["API uptime", "99.98%"],
            ["Job queue lag", "1.2s"],
            ["Email delivery", "99.4%"],
            ["Stripe webhook age", "4s"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
              <b>{k}</b>
              <em className="sw-tag sw-tag-ok">{v}</em>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
