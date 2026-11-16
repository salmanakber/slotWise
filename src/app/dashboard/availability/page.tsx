export default function AvailabilityPage() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Weekly hours</h2>
        <p className="mb-2 text-[13px]" style={{ color: "var(--mut)" }}>
          Applies to all staff unless overridden
        </p>
        {days.map((d, i) => (
          <div key={d} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <b>{d}</b>
            <em className="sw-tag sw-tag-muted">{i < 5 ? "09:00 – 17:00" : i === 5 ? "09:00 – 13:00" : "Closed"}</em>
          </div>
        ))}
      </section>
      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Time off</h2>
        <button type="button" className="sw-btn">
          Add time off
        </button>
      </section>
    </div>
  );
}
