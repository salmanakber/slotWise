export default function PaymentsPage() {
  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Stripe</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Money goes straight to your account. Slotwise takes no commission.
        </p>
        {[
          ["Stripe account", "Connected as Studio Nine"],
          ["Currency", "USD"],
          ["Collect payment", "Deposit"],
          ["Deposit amount", "30%"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <b>{k}</b>
            <em className={`sw-tag ${k === "Stripe account" ? "sw-tag-ok" : "sw-tag-muted"}`}>{v}</em>
          </div>
        ))}
      </section>
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Policies</h2>
        {[
          ["Free cancellation until", "24 hours"],
          ["Late-cancel and no-show fee", "25%"],
          ["Save card for no-show protection", "On"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <b>{k}</b>
            <em className="sw-tag sw-tag-muted">{v}</em>
          </div>
        ))}
      </section>
    </div>
  );
}
