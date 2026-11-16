export default function PlatformSettingsPage() {
  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Owner team</h2>
        {[
          ["You", "Owner · full access"],
          ["Sara M.", "Ops · sites and support"],
        ].map(([name, role]) => (
          <div key={name} className="flex items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <div>
              <b>{name}</b>
              <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                {role}
              </small>
            </div>
            <button type="button" className="sw-btn">
              Edit
            </button>
          </div>
        ))}
      </section>
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Danger zone</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
          <div>
            <b>Maintenance mode</b>
            <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
              Blocks new bookings platform-wide
            </small>
          </div>
          <em className="sw-tag sw-tag-muted">Off</em>
        </div>
      </section>
    </div>
  );
}
