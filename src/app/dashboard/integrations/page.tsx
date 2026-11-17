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
    blurb: "Keep bookings on your Google Calendar",
  },
  outlook: {
    label: "Outlook",
    blurb: "Keep bookings on Outlook / Microsoft 365",
  },
  zapier: {
    label: "Zapier",
    blurb: "Send new bookings into your other apps automatically",
  },
  zoom: {
    label: "Zoom",
    blurb: "Add a Zoom link to online bookings",
  },
  meet: {
    label: "Google Meet",
    blurb: "Add a Meet link to online bookings",
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

  async function connect(provider: string) {
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
          {data.webflow.platformConfigured && data.webflow.installUrl ? (
            <a href={data.webflow.installUrl} className="sw-btn sw-btn-primary">
              Reconnect Webflow
            </a>
          ) : (
            <em className="sw-tag sw-tag-muted">Not ready yet</em>
          )}
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
        <h2 className="mb-1 text-[15px] font-extrabold">Calendars and tools</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Connect the tools you already use. One click when they’re available for your account.
        </p>

        {(["google_calendar", "outlook", "zapier", "zoom", "meet"] as const).map((key) => {
          const row = byProvider[key];
          const meta = PROVIDER_META[key];
          if (!row || !meta) return null;
          const pending = busy === key;
          const comingSoon = key === "zapier" && !row.platformConfigured;

          return (
            <div key={key} className="border-t border-[var(--ln)] py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <b>{meta.label}</b>
                  <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
                    {comingSoon
                      ? "Coming soon — connect in one click when it’s ready"
                      : row.connected && row.externalAccountEmail
                        ? row.externalAccountEmail
                        : meta.blurb}
                    {!comingSoon && !row.platformConfigured && row.hint
                      ? ` · ${row.hint}`
                      : null}
                  </small>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {comingSoon ? (
                    <em className="sw-tag sw-tag-muted">Coming soon</em>
                  ) : (
                    <>
                      <em className={`sw-tag ${row.connected ? "sw-tag-ok" : "sw-tag-muted"}`}>
                        {row.connected ? "Connected" : "Not connected"}
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
                      ) : row.platformConfigured ? (
                        <button
                          type="button"
                          className="sw-btn sw-btn-primary"
                          disabled={pending}
                          onClick={() => void connect(key)}
                        >
                          {pending ? "…" : "Connect"}
                        </button>
                      ) : (
                        <em className="sw-tag sw-tag-muted">Not available yet</em>
                      )}
                    </>
                  )}
                </div>
              </div>
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
