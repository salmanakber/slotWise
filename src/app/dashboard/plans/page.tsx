import { formatMoney } from "@/lib/utils";

const PLANS = [
  { name: "Free", price: 0, features: ["1 staff, 1 location", "25 bookings a month", "Email reminders", "2 themes"] },
  { name: "Pro", price: 15, current: true, features: ["500 bookings a month", "3 staff", "Calendar sync", "4 themes"] },
  { name: "Business", price: 39, features: ["15 staff, multi-location", "Unlimited bookings", "Packages and waitlist", "All 8 themes"] },
  { name: "Agency", price: 99, features: ["Unlimited client sites", "White-label", "Priority support", "Custom themes"] },
];

export default function PlansPage() {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {PLANS.map((p) => (
        <section key={p.name} className={`sw-card flex flex-col gap-2.5 ${p.current ? "shadow-[0_0_0_2px_var(--ac)]" : ""}`}>
          <h2 className="m-0 text-[15px] font-extrabold">
            {p.name}
            {p.current ? <em className="sw-tag sw-tag-ok ml-2">Current</em> : null}
          </h2>
          <div className="text-[28px] font-extrabold">
            {formatMoney(p.price * 100)}
            <small className="text-[13px] font-semibold" style={{ color: "var(--mut)" }}>
              {" "}
              a month
            </small>
          </div>
          <ul className="m-0 flex-1 list-disc pl-[18px] text-[13.5px]" style={{ color: "var(--mut)" }}>
            {p.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <button type="button" className="sw-btn">
            {p.current ? "Manage plan" : "Upgrade"}
          </button>
        </section>
      ))}
    </div>
  );
}
