export default function PlatformStripePage() {
  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Platform Stripe</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Slotwise platform account. Customer charges go to connected accounts; Slotwise takes no booking commission.
        </p>
        {[
          ["Mode", "Live / Test via env"],
          ["Publishable key", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
          ["Secret key", "STRIPE_SECRET_KEY (server only)"],
          ["Webhook secret", "STRIPE_WEBHOOK_SECRET"],
          ["Application fee", "0% · no commission"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <b>{k}</b>
            <em className="sw-tag sw-tag-muted">{v}</em>
          </div>
        ))}
      </section>

      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Connect defaults</h2>
        {[
          "Require onboarding before go-live",
          "Allow deposits",
          "Allow pay on site",
          "Save card for no-show protection",
        ].map((label) => (
          <div key={label} className="flex items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <b>{label}</b>
            <em className="sw-tag sw-tag-ok">On</em>
          </div>
        ))}
      </section>
    </div>
  );
}
