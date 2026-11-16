export default function PlatformCustomersPage() {
  const rows = [
    ["Studio Nine Agency", "3 sites · Agency", "Active"],
    ["Northwind Co.", "1 site · Business", "Active"],
    ["Agency Desk", "8 sites · Agency", "Active"],
    ["Tutorly HQ", "1 site · Pro", "Active"],
  ];

  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Workspaces</h2>
        {rows.map(([name, meta, status]) => (
          <div key={name} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <div>
              <b>{name}</b>
              <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                {meta}
              </small>
            </div>
            <em className="sw-tag sw-tag-ok">{status}</em>
          </div>
        ))}
      </section>
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Owner actions</h2>
        {[
          ["Force password reset", "For compromised accounts"],
          ["Export customer CSV", "GDPR / finance"],
          ["Clone settings between sites", "Agency tooling"],
        ].map(([label, hint]) => (
          <div key={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <div>
              <b>{label}</b>
              <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                {hint}
              </small>
            </div>
            <button type="button" className="sw-btn">
              Run
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
