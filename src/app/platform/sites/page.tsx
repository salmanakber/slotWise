import { SiteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SiteStatusToggle } from "./site-status-toggle";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "demo-1", publicKey: "sw_8f2k91", name: "Studio Nine", status: "ACTIVE" as SiteStatus, plan: "Pro", bookings: 412, workspace: "Studio Nine Agency" },
  { id: "demo-2", publicKey: "sw_a91c22", name: "Northwind Clean", status: "ACTIVE" as SiteStatus, plan: "Business", bookings: 1180, workspace: "Northwind Co." },
  { id: "demo-3", publicKey: "sw_c44d0", name: "Lens & Light", status: "INACTIVE" as SiteStatus, plan: "Agency", bookings: 0, workspace: "Agency Desk" },
  { id: "demo-4", publicKey: "sw_e77aa", name: "Clinic One", status: "SUSPENDED" as SiteStatus, plan: "Business", bookings: 640, workspace: "Clinic One" },
];

async function getSites() {
  try {
    const sites = await prisma.site.findMany({
      include: {
        plan: true,
        workspace: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!sites.length) return { rows: FALLBACK, live: false as const };
    return {
      live: true as const,
      rows: sites.map((s) => ({
        id: s.id,
        publicKey: s.publicKey,
        name: s.name,
        status: s.status,
        plan: s.plan?.name ?? "Free",
        bookings: s._count.bookings,
        workspace: s.workspace.name,
      })),
    };
  } catch {
    return { rows: FALLBACK, live: false as const };
  }
}

export default async function PlatformSitesPage() {
  const { rows, live } = await getSites();

  return (
    <section className="sw-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-[15px] font-extrabold">All sites</h2>
        {!live ? (
          <em className="sw-tag sw-tag-muted">Demo data · connect DATABASE_URL</em>
        ) : (
          <em className="sw-tag sw-tag-ok">Live from Postgres</em>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="text-[12.5px] font-semibold" style={{ color: "var(--mut)" }}>
              {["Site", "Workspace", "Plan", "Bookings", "Status", ""].map((h) => (
                <th key={h || "actions"} className="px-2 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-[var(--ln)]">
                <td className="px-2 py-2.5">
                  <b>{s.name}</b>
                  <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {s.publicKey}
                  </small>
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap">{s.workspace}</td>
                <td className="px-2 py-2.5">{s.plan}</td>
                <td className="px-2 py-2.5">{s.bookings.toLocaleString()}</td>
                <td className="px-2 py-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--mut)]">
                    <i
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: s.status === "ACTIVE" ? "var(--ok)" : "var(--mut)" }}
                    />
                    {s.status === "ACTIVE" ? "Active" : s.status === "SUSPENDED" ? "Suspended" : "Inactive"}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <SiteStatusToggle siteId={s.id} status={s.status} live={live} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
