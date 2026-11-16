export default function PlatformAuditPage() {
  const rows = [
    ["Today 13:04", "You", "Deactivated site sw_e77aa (Clinic One)", "Sites"],
    ["Today 11:22", "You", "Updated Pro price draft", "Billing"],
    ["Yesterday", "Sara M.", "Enabled waitlist flag globally", "Config"],
    ["Mon", "You", "Rotated Stripe webhook secret", "Billing"],
  ];

  return (
    <section className="sw-card">
      <h2 className="mb-3 text-[15px] font-extrabold">Recent changes</h2>
      {rows.map(([when, who, action, scope]) => (
        <div key={action} className="flex items-center gap-3 border-t border-[var(--ln)] py-2.5">
          <span className="flex-1">
            <b>{action}</b>
            <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
              {when} · {who}
            </small>
          </span>
          <em className="sw-tag sw-tag-muted">{scope}</em>
        </div>
      ))}
    </section>
  );
}
