import { getDemoSite } from "@/lib/sites";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const site = await getDemoSite();
  const rows = site?.bookings ?? [];

  return (
    <section className="sw-card overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-[15px] font-extrabold">All bookings</h2>
        <em className={`sw-tag ${site ? "sw-tag-ok" : "sw-tag-muted"}`}>
          {site ? `${rows.length} loaded` : "Demo · connect DB"}
        </em>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="text-[12.5px] font-semibold" style={{ color: "var(--mut)" }}>
              {["ID", "Customer", "Service", "When", "Staff", "Amount", "Status"].map((h) => (
                <th key={h} className="px-2 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-sm" style={{ color: "var(--mut)" }}>
                  No bookings yet. Open the public booking page and create one.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-t border-[var(--ln)]">
                  <td className="whitespace-nowrap px-2 py-2.5">{b.reference}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <b>{b.customerName}</b>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">{b.service.name}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {new Date(b.startsAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {b.staff.map((s) => s.staff.name).join(", ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {formatMoney(b.amountCents, b.currency)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <em
                      className={`sw-tag ${
                        b.status === "PAID" || b.status === "CONFIRMED"
                          ? "sw-tag-ok"
                          : b.status === "CANCELLED"
                            ? "sw-tag-muted"
                            : ""
                      }`}
                    >
                      {b.status}
                    </em>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
