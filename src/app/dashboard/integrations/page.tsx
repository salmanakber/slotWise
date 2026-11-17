"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ProviderRow = {
  provider: string;
  status: string;
  connected: boolean;
  externalAccountEmail: string | null;
  webhookUrl: string | null;
  lastSyncAt: string | null;
  platformConfigured: boolean;
  hint: string | null;
};

type IntegrationsPayload = {
  webflow: {
    provider: string;
    platformConfigured: boolean;
    installUrl: string | null;
    hint: string | null;
  };
  stripe: {
    provider: string;
    platformConfigured: boolean;
    paymentsUrl: string;
    mode: string;
    hint: string | null;
  };
  providers: ProviderRow[];
};

const PROVIDER_META: Record<string, { label: string; blurb: string }> = {
  google_calendar: {
    label: "Google Calendar",
    blurb: "Two-way sync for bookings",
  },
  outlook: {
    label: "Outlook",
    blurb: "Microsoft 365 / Outlook calendar",
  },
  zapier: {
    label: "Automations (webhook)",
    blurb: "Free via Make.com — or any HTTPS webhook. Zapier Catch Hook needs Zapier paid.",
  },
  zoom: {
    label: "Zoom",
    blurb: "Auto meeting links on bookings",
  },
  meet: {
    label: "Google Meet",
    blurb: "Attach Meet links to calendar events",
  },
};

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <section className="sw-card">
          <p className="text-sm" style={{ color: "var(--mut)" }}>
            Loading integrations…
          </p>
        </section>
      }
    >
      <IntegrationsClient />
    </Suspense>
  );
}

function IntegrationsClient() {
  const search = useSearchParams();
  const [data, setData] = useState<IntegrationsPayload | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [zapierUrl, setZapierUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/site/integrations");
    const json = await res.json();
    if (res.ok) setData(json);
    else setMsg(json.error || "Could not load integrations");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const connected = search.get("connected");
    const error = search.get("error");
    if (connected) setMsg(`Connected ${connected.replace(/_/g, " ")}`);
    if (error) setMsg(`Connect failed: ${error}`);
  }, [search]);

  async function connect(provider: string, extra?: { webhookUrl?: string }) {
    setBusy(provider);
    setMsg("");
    try {
      const res = await fetch("/api/site/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.hint || "Connect failed");
      }
      if (json.authorizeUrl) {
        window.location.href = json.authorizeUrl;
        return;
      }
      await load();
      if (provider === "zapier") {
        setZapierUrl("");
        setMsg("Zapier connected. New bookings will POST to your Catch Hook.");
      } else setMsg("Connected");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider);
    setMsg("");
    try {
      const res = await fetch(
        `/api/site/integrations?provider=${encodeURIComponent(provider)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Disconnect failed");
      await load();
      setMsg("Disconnected");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  }

  async function copyWebhook(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Webhook URL copied");
    } catch {
      setMsg("Could not copy — select the URL manually");
    }
  }

  if (!data) {
    return (
      <section className="sw-card">
        <p className="text-sm" style={{ color: "var(--mut)" }}>
          {msg || "Loading integrations…"}
        </p>
      </section>
    );
  }

  const byProvider = Object.fromEntries(data.providers.map((p) => [p.provider, p]));

  return (
    <div className="grid gap-3.5">
      {msg ? (
        <div className="rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3.5 py-3 text-[13px] font-semibold text-[var(--at)]">
          {msg}
        </div>
      ) : null}

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Webflow</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Site owners install from Webflow. After authorize, open Designer → Slotwise → Insert
          booking embed.
        </p>
        <Row
          label="Connection"
          hint={
            data.webflow.platformConfigured
              ? "Credentials configured — re-auth if scopes changed"
              : data.webflow.hint ||
                "Ask platform admin to add Client ID in Platform → Settings"
          }
        >
          {data.webflow.platformConfigured && data.webflow.installUrl ? (
            <a href={data.webflow.installUrl} className="sw-btn sw-btn-primary">
              Re-authorize Webflow
            </a>
          ) : (
            <em className="sw-tag sw-tag-muted">Not configured</em>
          )}
        </Row>
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Stripe Connect</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Connect payouts and payment policies from the Payments page.
        </p>
        <Row
          label="Platform keys"
          hint={
            data.stripe.platformConfigured
              ? `Ready · ${data.stripe.mode} mode`
              : data.stripe.hint ||
                "Ask platform admin to add Client ID in Platform → Settings"
          }
        >
          <Link href={data.stripe.paymentsUrl} className="sw-btn sw-btn-primary">
            Open payments
          </Link>
        </Row>
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Calendars and tools</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Connect calendars and meeting tools. OAuth apps are configured by the platform admin.
        </p>

        {(["google_calendar", "outlook", "zapier", "zoom", "meet"] as const).map((key) => {
          const row = byProvider[key];
          const meta = PROVIDER_META[key];
          if (!row || !meta) return null;
          const pending = busy === key;

          return (
            <div key={key} className="border-t border-[var(--ln)] py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <b>{meta.label}</b>
                  <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {row.connected && row.externalAccountEmail
                      ? row.externalAccountEmail
                      : meta.blurb}
                    {!row.platformConfigured && row.hint
                      ? ` · ${row.hint}`
                      : null}
                  </small>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <em className={`sw-tag ${row.connected ? "sw-tag-ok" : "sw-tag-muted"}`}>
                    {row.connected ? "Connected" : "Disconnected"}
                  </em>
                  {row.connected ? (
                    <button
                      type="button"
                      className="sw-btn"
                      disabled={pending}
                      onClick={() => void disconnect(key)}
                    >
                      {pending ? "…" : "Disconnect"}
                    </button>
                  ) : key === "zapier" ? null : row.platformConfigured ? (
                    <button
                      type="button"
                      className="sw-btn sw-btn-primary"
                      disabled={pending}
                      onClick={() => void connect(key)}
                    >
                      {pending ? "…" : "Connect"}
                    </button>
                  ) : (
                    <em className="sw-tag sw-tag-muted">Needs platform keys</em>
                  )}
                </div>
              </div>
              {key === "zapier" ? (
                <div className="mt-3 grid gap-2 rounded-xl border border-[var(--ln)] bg-[var(--bg)] p-3 text-[13px]">
                  <p className="font-semibold text-[var(--ink)]">
                    Free path (recommended): Make.com
                  </p>
                  <ol className="list-decimal space-y-1 pl-4" style={{ color: "var(--mut)" }}>
                    <li>
                      Open{" "}
                      <a
                        href="https://www.make.com"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline underline-offset-2"
                      >
                        make.com
                      </a>{" "}
                      (free plan works) → Create a scenario
                    </li>
                    <li>
                      Add module → <b>Webhooks</b> → <b>Custom webhook</b> → Add → copy the URL
                    </li>
                    <li>Paste below → Save & connect</li>
                    <li>Add next steps (Sheets, email, Slack…) and turn the scenario on</li>
                  </ol>
                  <p className="text-[12px]" style={{ color: "var(--mut)" }}>
                    Also works with Discord/Slack incoming webhooks, n8n, or Pipedream. Zapier’s{" "}
                    <b>Catch Hook</b> is a Zapier paid feature — we can’t unlock that from Slotwise.
                  </p>
                  {row.connected && row.webhookUrl ? (
                    <p className="text-[12px]" style={{ color: "var(--mut)" }}>
                      Sending to:{" "}
                      <code className="break-all font-semibold">{row.webhookUrl}</code>
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="url"
                      className="min-w-[240px] flex-1 rounded-[10px] border border-[var(--ln)] bg-[var(--panel)] px-2.5 py-2"
                      placeholder="https://hook.eu1.make.com/… or hooks.zapier.com/…"
                      value={zapierUrl}
                      onChange={(e) => setZapierUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className="sw-btn sw-btn-primary"
                      disabled={pending || !zapierUrl.trim()}
                      onClick={() => void connect("zapier", { webhookUrl: zapierUrl.trim() })}
                    >
                      {pending ? "…" : row.connected ? "Update hook" : "Save & connect"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <div>
        <b>{label}</b>
        {hint ? (
          <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
            {hint}
          </small>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
