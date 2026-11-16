export default function SettingsPage() {
  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Business</h2>
        {[
          ["Business name", "Studio Nine"],
          ["Time zone", "Auto-detect"],
          ["Language", "English"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <b>{k}</b>
            <em className="sw-tag sw-tag-muted">{v}</em>
          </div>
        ))}
      </section>
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Privacy</h2>
        {[
          ["Cookie-free widget", "On"],
          ["Data retention", "24 months"],
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
