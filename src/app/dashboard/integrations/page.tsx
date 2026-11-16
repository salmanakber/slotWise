import Link from "next/link";
import { getPlatformPublicSettings } from "@/lib/platform-config";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const settings = await getPlatformPublicSettings();
  const wf = settings.webflowClientSecretSet && Boolean(settings.webflowClientId);
  const stripe = settings.stripeSecretKeySet;

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Webflow</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Site owners install from Webflow (no Slotwise login). After authorize, they open Designer →
          Slotwise → Insert booking embed. Platform credentials live under Platform → Settings.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
          <div>
            <b>Connection</b>
            <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
              {wf
                ? "Credentials configured — install URL /api/webflow/install"
                : "Ask platform owner to add Webflow credentials"}
            </small>
          </div>
          {wf ? (
            <a href="/api/webflow/install" className="sw-btn sw-btn-primary">
              Re-authorize Webflow
            </a>
          ) : (
            <em className="sw-tag sw-tag-muted">Not configured</em>
          )}
        </div>
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Stripe Connect</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Money goes to the business. Platform fee is controlled in Platform → Stripe (default 0%).
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
          <div>
            <b>Platform keys</b>
            <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
              {stripe ? `Ready · ${settings.stripeMode} mode` : "Configure in Platform → Stripe"}
            </small>
          </div>
          <em className={`sw-tag ${stripe ? "sw-tag-ok" : "sw-tag-muted"}`}>
            {stripe ? "Ready" : "Optional for local booking tests"}
          </em>
        </div>
        <div className="border-t border-[var(--ln)] py-3 text-sm" style={{ color: "var(--mut)" }}>
          Webhook endpoint: <code className="font-semibold">/api/stripe/webhook</code>
        </div>
      </section>

      <section className="sw-card">
        <h2 className="mb-3 text-[15px] font-extrabold">Calendars and tools</h2>
        {[
          ["Google Calendar", "P1 · two-way sync"],
          ["Outlook", "P1"],
          ["Zapier / Make", "P1 webhooks"],
          ["Zoom / Meet", "P1 auto links"],
        ].map(([label, meta]) => (
          <div key={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
            <div>
              <b>{label}</b>
              <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                {meta}
              </small>
            </div>
            <em className="sw-tag sw-tag-muted">Soon</em>
          </div>
        ))}
        <p className="mt-2 text-[13px]" style={{ color: "var(--mut)" }}>
          Prefer <Link href="/dashboard/branding" className="underline">Branding → Install</Link> for the
          embed snippet while Webflow OAuth is offline.
        </p>
      </section>
    </div>
  );
}
