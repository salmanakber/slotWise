import { FEATURE_FLAGS } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { FlagToggle } from "./flag-toggle";

export const dynamic = "force-dynamic";

async function getFlags() {
  try {
    const rows = await prisma.featureFlag.findMany({ orderBy: [{ phase: "asc" }, { key: "asc" }] });
    if (rows.length) return { rows, live: true as const };
  } catch {
    /* fall through */
  }
  return {
    live: false as const,
    rows: FEATURE_FLAGS.map((f) => ({
      id: f.key,
      key: f.key,
      label: f.label,
      description: f.description ?? null,
      phase: f.phase,
      enabled: f.enabled,
    })),
  };
}

export default async function PlatformConfigPage() {
  const { rows, live } = await getFlags();
  const groups = ["P0", "P1", "P2"] as const;

  return (
    <div className="grid gap-3.5">
      {!live ? (
        <div className="rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3.5 py-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Showing default flags. Connect Postgres and run seed to persist toggles.
        </div>
      ) : null}
      {groups.map((phase) => (
        <section key={phase} className="sw-card">
          <h2 className="mb-1 text-[15px] font-extrabold">
            {phase} · {phase === "P0" ? "Launch" : phase === "P1" ? "Advance past competitors" : "Moat"}
          </h2>
          <p className="mb-2 text-[13px]" style={{ color: "var(--mut)" }}>
            Flags control rollout without a deploy. Site owners only see features that are on and included in their plan.
          </p>
          {rows
            .filter((f) => f.phase === phase)
            .map((f) => (
              <div key={f.key} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
                <div>
                  <b>{f.label}</b>
                  <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {f.description}
                  </small>
                </div>
                <FlagToggle flagKey={f.key} enabled={f.enabled} live={live} />
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
