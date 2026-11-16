export default function NotificationsPage() {
  return (
    <div className="grid gap-3.5">
      {[
        ["Email", [["Booking confirmation", "On"], ["Reminder", "24 hours"], ["Follow-up and review request", "On"]]],
        ["SMS and WhatsApp", [["SMS reminders", "On"], ["WhatsApp reminders", "Off"], ["Quiet hours", "21:00 to 08:00"]]],
      ].map(([title, rows]) => (
        <section key={String(title)} className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">{title as string}</h2>
          {(rows as string[][]).map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
              <b>{label}</b>
              <em className="sw-tag sw-tag-muted">{value}</em>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
