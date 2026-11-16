import { getDemoSite } from "@/lib/sites";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const site = await getDemoSite();
  const services = site?.services ?? [];

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Services</h2>
        <p className="mb-2 text-[13px]" style={{ color: "var(--mut)" }}>
          Duration, price and buffers drive availability. CMS sync will mirror these into Webflow collections.
        </p>
        {services.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            No services yet. Run <code>npm run db:seed</code>.
          </p>
        ) : (
          services.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
              <div>
                <b>{s.name}</b>
                <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                  {s.durationMin} min · {formatMoney(s.priceCents, site?.currency)} · buffer {s.bufferAfterMin}m · notice{" "}
                  {s.minNoticeMin}m
                </small>
              </div>
              <em className={`sw-tag ${s.active ? "sw-tag-ok" : "sw-tag-muted"}`}>{s.active ? "On" : "Off"}</em>
            </div>
          ))
        )}
      </section>

      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Booking rules</h2>
        {[
          ["Double-book prevention", "Transactional slot lock"],
          ["Timezone", site?.timezone ?? "UTC"],
          ["Currency", site?.currency ?? "USD"],
          ["Waitlist auto-offer", "P1 · 15 minute claim"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <b>{label}</b>
            <em className="sw-tag sw-tag-muted">{value}</em>
          </div>
        ))}
      </section>
    </div>
  );
}
