import Link from "next/link";
import { webflowConfigured } from "@/lib/webflow";
import { stripeConfigured } from "@/lib/stripe";

export default function IntegrationsPage() {
  const wf = webflowConfigured();
  const stripe = stripeConfigured();

  return (
    <div className="grid gap-3.5">
      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Webflow</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Hybrid app: OAuth once, then Slotwise can place the widget via Custom Code API and sync CMS.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
          <div>
            <b>Connection</b>
            <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
              {wf ? "Env vars present — start OAuth" : "Add WEBFLOW_CLIENT_ID / SECRET to .env"}
            </small>
          </div>
          {wf ? (
            <a href="/api/webflow/start" className="sw-btn sw-btn-primary">
              Connect Webflow
            </a>
          ) : (
            <em className="sw-tag sw-tag-muted">Not configured</em>
          )}
        </div>
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Stripe Connect</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Money goes to the business. Slotwise application fee is 0%.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
          <div>
            <b>Platform keys</b>
            <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
              {stripe ? "STRIPE_SECRET_KEY detected" : "Add STRIPE_SECRET_KEY to enable payments"}
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
