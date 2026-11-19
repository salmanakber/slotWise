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

const PROVIDER_META: Record<string, { label: string; blurb: string; credentials?: boolean }> = {
  google_calendar: {
    label: "Google Calendar",
    blurb: "Keep bookings on your Google Calendar",
  },
  outlook: {
    label: "Outlook",
    blurb: "Keep bookings on Outlook / Microsoft 365",
  },
  apple_calendar: {
    label: "Apple Calendar / iCloud",
    blurb: "Sync bookings with an Apple ID + app-specific password",
    credentials: true,
  },
  teams: {
    label: "Microsoft Teams",
    blurb: "Create Teams meeting links for online bookings",
  },
  zoom: {
    label: "Zoom",
    blurb: "Add a Zoom link to online bookings",
  },
  meet: {
    label: "Google Meet",
    blurb: "Add a Meet link to online bookings",
  },
  hubspot: {
    label: "HubSpot",
    blurb: "Create contacts in HubSpot when someone books",
  },
  mailchimp: {
    label: "Mailchimp",
    blurb: "Add bookers to a Mailchimp audience",
    credentials: true,
  },
  zapier: {
    label: "Zapier",
    blurb: "Send new bookings into your other apps automatically",
  },
};

const PROVIDER_ORDER = [
  "google_calendar",
  "apple_calendar",
  "outlook",
  "meet",
  "teams",
  "zoom",
  "hubspot",
  "mailchimp",
  "zapier",
] as const;

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
  const [credProvider, setCredProvider] = useState<string | null>(null);
  const [credAccount, setCredAccount] = useState("");
  const [credSecret, setCredSecret] = useState("");
  const [credAudience, setCredAudience] = useState("");

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
    if (error) {
      const raw = decodeURIComponent(error);
      if (/verification|tested|tester/i.test(raw)) {
        setMsg(
          "Google is still in testing mode. In Google Cloud → OAuth consent screen, add this Google account under Test users, then try Connect again.",
        );
      } else {
        setMsg(`Connect failed: ${raw}`);
      }
    }
  }, [search]);

  async function saveCredentials(provider: string) {
    setBusy(provider);
    setMsg("");
    try {
      const res = await fetch("/api/site/integrations/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          account: credAccount.trim() || undefined,
          secret: credSecret.trim(),
          audienceId: credAudience.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save");
      setCredProvider(null);
      setCredAccount("");
      setCredSecret("");
      setCredAudience("");
      setMsg(`Connected ${provider.replace(/_/g, " ")}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  async function connect(provider: string) {
    if (PROVIDER_META[provider]?.credentials) {
      setCredProvider(provider);
      setMsg("");
      return;
    }
    setBusy(provider);
    setMsg("");
    try {
      const res = await fetch("/api/site/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
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
      setMsg("Connected");
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
          Connect your Webflow site so you can place the booking widget from the Designer.
        </p>
        <Row
          label="Connection"
          hint={
            data.webflow.platformConfigured
              ? "Ready — reconnect if something stops working"
              : data.webflow.hint || "Ask your Slotwise admin to finish Webflow setup"
          }
        >
          <div className="flex flex-wrap gap-2">
            {data.webflow.platformConfigured && data.webflow.installUrl ? (
              <a href={data.webflow.installUrl} className="sw-btn sw-btn-primary">
                Reconnect Webflow
              </a>
            ) : (
              <em className="sw-tag sw-tag-muted">Not ready yet</em>
            )}
            <button
              type="button"
              className="sw-btn"
              onClick={() => {
                void (async () => {
                  const res = await fetch("/api/webflow/uninstall", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  });
                  // Resolve site from session on server — pass empty and fix API
                  const json = await res.json().catch(() => ({}));
                  setMsg(
                    res.ok
                      ? json.message ||
                          "Disconnected. Publish your Webflow site so script removal goes live. Delete any leftover booking iframes in Designer."
                      : json.error || "Could not disconnect",
                  );
                  void load();
                })();
              }}
            >
              Disconnect & hide widget
            </button>
          </div>
        </Row>
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Payments</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Collect deposits or full payment when someone books.
        </p>
        <Row
          label="Stripe"
          hint={
            data.stripe.platformConfigured
              ? `Ready · ${data.stripe.mode} mode`
              : data.stripe.hint || "Ask your Slotwise admin to finish Stripe setup"
          }
        >
          <Link href={data.stripe.paymentsUrl} className="sw-btn sw-btn-primary">
            Open payments
          </Link>
        </Row>
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Calendars, video & marketing</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Connect calendars, meeting apps, HubSpot, and Mailchimp. Some need platform OAuth keys;
          Apple Calendar and Mailchimp use your own credentials.
        </p>

        {PROVIDER_ORDER.map((key) => {
          const row = byProvider[key];
          const meta = PROVIDER_META[key];
          if (!row || !meta) return null;
          if (!row.platformConfigured && !row.connected && !meta.credentials) return null;
          const pending = busy === key;
          const showForm = credProvider === key;

          return (
            <div key={key} className="border-t border-[var(--ln)] py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <b>{meta.label}</b>
                  <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {row.connected && row.externalAccountEmail
                      ? row.externalAccountEmail
                      : meta.blurb}
                  </small>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <em
                    className={`sw-tag ${
                      row.status === "error"
                        ? "sw-tag-bad"
                        : row.connected
                          ? "sw-tag-ok"
                          : "sw-tag-muted"
                    }`}
                  >
                    {row.status === "error"
                      ? "Needs reconnect"
                      : row.connected
                        ? "Connected"
                        : "Not connected"}
                  </em>
                  {row.connected ? (
                    <>
                      {!meta.credentials ? (
                        <button
                          type="button"
                          className="sw-btn"
                          disabled={pending}
                          onClick={() => void connect(key)}
                        >
                          {pending ? "…" : "Reconnect"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sw-btn"
                          disabled={pending}
                          onClick={() => setCredProvider(key)}
                        >
                          Update
                        </button>
                      )}
                      <button
                        type="button"
                        className="sw-btn"
                        disabled={pending}
                        onClick={() => void disconnect(key)}
                      >
                        {pending ? "…" : "Disconnect"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="sw-btn sw-btn-primary"
                      disabled={pending}
                      onClick={() => void connect(key)}
                    >
                      {pending ? "…" : meta.credentials ? "Add credentials" : "Connect"}
                    </button>
                  )}
                </div>
              </div>
              {showForm ? (
                <div className="mt-3 grid gap-2 rounded-[12px] border border-[var(--ln)] bg-[var(--sf)] p-3 sm:grid-cols-2">
                  {key === "apple_calendar" || key === "mailchimp" ? (
                    <input
                      className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 text-[13px]"
                      placeholder={key === "apple_calendar" ? "Apple ID email" : "Account email (optional)"}
                      value={credAccount}
                      onChange={(e) => setCredAccount(e.target.value)}
                    />
                  ) : null}
                  <input
                    type="password"
                    className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 text-[13px]"
                    placeholder={
                      key === "apple_calendar"
                        ? "App-specific password"
                        : key === "mailchimp"
                          ? "Mailchimp API key"
                          : "Secret"
                    }
                    value={credSecret}
                    onChange={(e) => setCredSecret(e.target.value)}
                  />
                  {key === "mailchimp" ? (
                    <input
                      className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 text-[13px] sm:col-span-2"
                      placeholder="Audience / list ID"
                      value={credAudience}
                      onChange={(e) => setCredAudience(e.target.value)}
                    />
                  ) : null}
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className="sw-btn sw-btn-primary"
                      disabled={pending || !credSecret.trim()}
                      onClick={() => void saveCredentials(key)}
                    >
                      {pending ? "Saving…" : "Save & connect"}
                    </button>
                    <button
                      type="button"
                      className="sw-btn"
                      onClick={() => setCredProvider(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Google Analytics 4</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Add your GA4 Measurement ID (G-XXXXXXXX) under{" "}
          <Link href="/dashboard/branding" className="font-extrabold underline">
            Branding
          </Link>{" "}
          — it loads on public booking pages.
        </p>
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
