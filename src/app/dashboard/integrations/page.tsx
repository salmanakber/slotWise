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

type ProviderMeta = {
  label: string;
  blurb: string;
  color: string;
  logo: React.ReactNode;
  logoLg: React.ReactNode;
};

const PROVIDER_ORDER = [
  "google_calendar",
  "outlook",
  "meet",
  "teams",
  "zoom",
  "mailchimp",
  "zapier",
] as const;

function LogoMark({
  bg,
  size = 48,
  children,
}: {
  bg: string;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <span
      className="grid place-items-center rounded-[22%] shadow-[inset_0_0_0_1px_rgba(255,255,255,.14),0_10px_28px_rgba(0,0,0,.12)]"
      style={{ background: bg, width: size, height: size }}
    >
      {children}
    </span>
  );
}

function GoogleCalSvg({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M5 4h14v3.2H5z" />
      <path fill="#EA4335" d="M16.5 7.2H19V18a2 2 0 0 1-2 2h-.5V7.2z" />
      <path fill="#34A853" d="M5 7.2h2.5V20H7a2 2 0 0 1-2-2V7.2z" />
      <path fill="#FBBC04" d="M7.5 16.5H16.5V20H7.5z" />
      <text x="12" y="14.8" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#1a73e8">
        31
      </text>
    </svg>
  );
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  google_calendar: {
    label: "Google Calendar",
    blurb: "Sync bookings to your Google Calendar",
    color: "#4285F4",
    logo: (
      <LogoMark bg="#fff">
        <GoogleCalSvg />
      </LogoMark>
    ),
    logoLg: (
      <LogoMark bg="#fff" size={88}>
        <GoogleCalSvg size={48} />
      </LogoMark>
    ),
  },
  outlook: {
    label: "Outlook",
    blurb: "Keep bookings on Outlook / Microsoft 365",
    color: "#0078D4",
    logo: (
      <LogoMark bg="#0078D4">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M3 6.5 12 4l9 2.5v11L12 20.5 3 17.5v-11zm9 1.2c-2.2 0-4 1.6-4 3.6s1.8 3.6 4 3.6 4-1.6 4-3.6-1.8-3.6-4-3.6z"
          />
        </svg>
      </LogoMark>
    ),
    logoLg: (
      <LogoMark bg="#0078D4" size={88}>
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M3 6.5 12 4l9 2.5v11L12 20.5 3 17.5v-11zm9 1.2c-2.2 0-4 1.6-4 3.6s1.8 3.6 4 3.6 4-1.6 4-3.6-1.8-3.6-4-3.6z"
          />
        </svg>
      </LogoMark>
    ),
  },
  meet: {
    label: "Google Meet",
    blurb: "Add a Meet link to online bookings",
    color: "#00897B",
    logo: (
      <LogoMark bg="#00897B">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M7 8.5h6.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 14v-4A1.5 1.5 0 0 1 7 8.5zm9.2 1.2 2.5-1.5c.4-.2.8.1.8.5v6.6c0 .4-.4.7-.8.5l-2.5-1.5v-4.6z"
          />
        </svg>
      </LogoMark>
    ),
    logoLg: (
      <LogoMark bg="#00897B" size={88}>
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M7 8.5h6.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 14v-4A1.5 1.5 0 0 1 7 8.5zm9.2 1.2 2.5-1.5c.4-.2.8.1.8.5v6.6c0 .4-.4.7-.8.5l-2.5-1.5v-4.6z"
          />
        </svg>
      </LogoMark>
    ),
  },
  teams: {
    label: "Microsoft Teams",
    blurb: "Create Teams meeting links for bookings",
    color: "#6264A7",
    logo: (
      <LogoMark bg="#6264A7">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M8.2 7.2h4.2c.7 0 1.2.5 1.2 1.2v7.2c0 .7-.5 1.2-1.2 1.2H8.2c-.7 0-1.2-.5-1.2-1.2V8.4c0-.7.5-1.2 1.2-1.2zm6.4 2.2h2.4c.6 0 1 .4 1 1v4.8c0 .9-.7 1.6-1.6 1.6h-1.8V9.4zM10.3 5.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z"
          />
        </svg>
      </LogoMark>
    ),
    logoLg: (
      <LogoMark bg="#6264A7" size={88}>
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M8.2 7.2h4.2c.7 0 1.2.5 1.2 1.2v7.2c0 .7-.5 1.2-1.2 1.2H8.2c-.7 0-1.2-.5-1.2-1.2V8.4c0-.7.5-1.2 1.2-1.2zm6.4 2.2h2.4c.6 0 1 .4 1 1v4.8c0 .9-.7 1.6-1.6 1.6h-1.8V9.4zM10.3 5.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z"
          />
        </svg>
      </LogoMark>
    ),
  },
  zoom: {
    label: "Zoom",
    blurb: "Add a Zoom link to online bookings",
    color: "#2D8CFF",
    logo: (
      <LogoMark bg="#2D8CFF">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M6.2 8.2h6.1c.9 0 1.6.7 1.6 1.6v4.4c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6V9.8c0-.9.7-1.6 1.6-1.6zm8.3 1.5 3.6-2.1c.4-.2.9.1.9.5v7.8c0 .5-.5.8-.9.5l-3.6-2.1v-4.6z"
          />
        </svg>
      </LogoMark>
    ),
    logoLg: (
      <LogoMark bg="#2D8CFF" size={88}>
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M6.2 8.2h6.1c.9 0 1.6.7 1.6 1.6v4.4c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6V9.8c0-.9.7-1.6 1.6-1.6zm8.3 1.5 3.6-2.1c.4-.2.9.1.9.5v7.8c0 .5-.5.8-.9.5l-3.6-2.1v-4.6z"
          />
        </svg>
      </LogoMark>
    ),
  },
  mailchimp: {
    label: "Mailchimp",
    blurb: "Add bookers to your Mailchimp audience",
    color: "#FFE01B",
    logo: (
      <LogoMark bg="#FFE01B">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#241C15"
            d="M12 4c-2.2 0-4 1.4-4.4 3.3C5.8 7.6 4.5 9 4.5 10.8c0 1.4.8 2.6 2 3.2v2.5c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5v-2.5c1.2-.6 2-1.8 2-3.2 0-1.8-1.3-3.2-3.1-3.5C16 5.4 14.2 4 12 4zm-1.2 11.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm2.4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"
          />
        </svg>
      </LogoMark>
    ),
    logoLg: (
      <LogoMark bg="#FFE01B" size={88}>
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#241C15"
            d="M12 4c-2.2 0-4 1.4-4.4 3.3C5.8 7.6 4.5 9 4.5 10.8c0 1.4.8 2.6 2 3.2v2.5c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5v-2.5c1.2-.6 2-1.8 2-3.2 0-1.8-1.3-3.2-3.1-3.5C16 5.4 14.2 4 12 4zm-1.2 11.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm2.4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"
          />
        </svg>
      </LogoMark>
    ),
  },
  zapier: {
    label: "Zapier",
    blurb: "Send bookings into your other apps",
    color: "#FF4A00",
    logo: (
      <LogoMark bg="#FF4A00">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M12 2.5 13.8 9H20l-5.2 3.6L16.6 19 12 15.8 7.4 19l1.8-6.4L4 9h6.2L12 2.5z"
          />
        </svg>
      </LogoMark>
    ),
    logoLg: (
      <LogoMark bg="#FF4A00" size={88}>
        <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#fff"
            d="M12 2.5 13.8 9H20l-5.2 3.6L16.6 19 12 15.8 7.4 19l1.8-6.4L4 9h6.2L12 2.5z"
          />
        </svg>
      </LogoMark>
    ),
  },
};

function ModalShell({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-[28px] border border-[var(--ln)] bg-[var(--pn)] shadow-[0_40px_100px_rgba(0,0,0,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function SuccessModal({
  open,
  title,
  body,
  logo,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  logo?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <ModalShell open={open} onClose={onClose} labelledBy="sw-int-success-title">
      <div className="relative px-7 pb-7 pt-8 text-center">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 70% 100% at 50% 0%, color-mix(in srgb, #178a58 22%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto flex justify-center">{logo}</div>
        <div
          className="relative mx-auto mt-[-14px] grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--pn)]"
          style={{ background: "#178a58" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M20 6 9 17l-5-5"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="sw-int-success-title" className="relative mt-4 text-[1.4rem] font-extrabold tracking-tight">
          {title}
        </h2>
        <p className="relative mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
          {body}
        </p>
        <button type="button" className="sw-btn sw-btn-primary relative mt-6 w-full justify-center" onClick={onClose}>
          Done
        </button>
      </div>
    </ModalShell>
  );
}

function ConnectModal({
  open,
  meta,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  meta: ProviderMeta | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!meta) return null;
  return (
    <ModalShell open={open} onClose={busy ? () => undefined : onClose} labelledBy="sw-int-connect-title">
      <div className="relative overflow-hidden px-7 pb-7 pt-8 text-center">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-36"
          style={{
            background: `radial-gradient(ellipse 80% 120% at 50% 0%, color-mix(in srgb, ${meta.color} 28%, transparent), transparent)`,
          }}
        />
        <div className="relative mx-auto flex justify-center">{meta.logoLg}</div>
        <h2 id="sw-int-connect-title" className="relative mt-5 text-[1.45rem] font-extrabold tracking-tight">
          Connect {meta.label}
        </h2>
        <p className="relative mx-auto mt-2 max-w-[32ch] text-[13.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
          {meta.blurb}. You’ll be asked to sign in and approve access.
        </p>
        {error ? (
          <p className="relative mt-3 text-[13px] font-semibold" style={{ color: "#c0392b" }} role="alert">
            {error}
          </p>
        ) : null}
        <div className="relative mt-6 grid gap-2">
          <button
            type="button"
            className="sw-btn sw-btn-primary w-full justify-center"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Connecting…" : `Continue with ${meta.label}`}
          </button>
          <button type="button" className="sw-btn w-full justify-center" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [ga4Id, setGa4Id] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [connectProvider, setConnectProvider] = useState<string | null>(null);
  const [connectError, setConnectError] = useState("");
  const [success, setSuccess] = useState<{
    title: string;
    body: string;
    provider?: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/site/integrations");
    const json = await res.json();
    if (res.ok) setData(json);
    else setError(json.error || "Could not load integrations");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/site/branding", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (typeof d.ga4MeasurementId === "string") setGa4Id(d.ga4MeasurementId);
        if (typeof d.metaPixelId === "string") setPixelId(d.metaPixelId);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const connected = search.get("connected");
    const err = search.get("error");
    if (connected) {
      const label = PROVIDER_META[connected]?.label || connected.replace(/_/g, " ");
      setSuccess({
        title: `${label} connected`,
        body: "You’re all set. New bookings can use this connection automatically.",
        provider: connected,
      });
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
    if (err) {
      setError(decodeURIComponent(err));
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
  }, [search]);

  async function runConnect(provider: string) {
    setBusy(provider);
    setConnectError("");
    setError("");
    try {
      const res = await fetch("/api/site/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.hint || "Could not connect");
      if (json.authorizeUrl) {
        window.location.href = json.authorizeUrl;
        return;
      }
      setConnectProvider(null);
      await load();
      const label = PROVIDER_META[provider]?.label || provider;
      setSuccess({
        title: `${label} connected`,
        body: "You’re all set. New bookings can use this connection automatically.",
        provider,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not connect";
      setConnectError(msg);
      setError(msg);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider);
    setError("");
    try {
      const res = await fetch(
        `/api/site/integrations?provider=${encodeURIComponent(provider)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not disconnect");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  }

  async function saveTracking() {
    setTrackingBusy(true);
    setError("");
    try {
      const res = await fetch("/api/site/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ga4MeasurementId: ga4Id.trim() || null,
          metaPixelId: pixelId.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save");
      setSuccess({
        title: "Tracking saved",
        body: "Google Analytics and Meta Pixel will load on your public booking page.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setTrackingBusy(false);
    }
  }

  if (!data) {
    return (
      <section className="sw-card">
        <p className="text-sm" style={{ color: "var(--mut)" }}>
          {error || "Loading integrations…"}
        </p>
      </section>
    );
  }

  const byProvider = Object.fromEntries(data.providers.map((p) => [p.provider, p]));
  const cards = PROVIDER_ORDER.map((key) => {
    const row = byProvider[key];
    const meta = PROVIDER_META[key];
    if (!meta || !row) return null;
    if (!row.platformConfigured && !row.connected) return null;
    return { key, row, meta };
  }).filter(Boolean) as { key: string; row: ProviderRow; meta: ProviderMeta }[];

  const connectMeta = connectProvider ? PROVIDER_META[connectProvider] || null : null;
  const successLogo = success?.provider ? PROVIDER_META[success.provider]?.logoLg : undefined;

  return (
    <div className="grid gap-4">
      <ConnectModal
        open={Boolean(connectProvider && connectMeta)}
        meta={connectMeta}
        busy={Boolean(connectProvider && busy === connectProvider)}
        error={connectError}
        onClose={() => {
          setConnectProvider(null);
          setConnectError("");
        }}
        onConfirm={() => {
          if (connectProvider) void runConnect(connectProvider);
        }}
      />

      <SuccessModal
        open={Boolean(success)}
        title={success?.title || ""}
        body={success?.body || ""}
        logo={successLogo}
        onClose={() => setSuccess(null)}
      />

      {error && !connectProvider ? (
        <div
          className="rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
          style={{
            borderColor: "color-mix(in srgb, #c0392b 35%, var(--ln))",
            background: "color-mix(in srgb, #c0392b 8%, var(--bg))",
            color: "#c0392b",
          }}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Site & payments</h2>
        <p className="mb-4 text-[13px]" style={{ color: "var(--mut)" }}>
          Core connections for your booking site.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--ln)] bg-[var(--sf)] p-4">
            <div className="flex items-start gap-3">
              <LogoMark bg="#4353FF">
                <span className="text-[13px] font-black text-white">W</span>
              </LogoMark>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">Webflow</div>
                <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
                  {data.webflow.platformConfigured
                    ? "Place the booking widget from Designer"
                    : data.webflow.hint || "Not available yet"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.webflow.platformConfigured && data.webflow.installUrl ? (
                    <a href={data.webflow.installUrl} className="sw-btn sw-btn-primary">
                      Connect
                    </a>
                  ) : (
                    <em className="sw-tag sw-tag-muted">Unavailable</em>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--ln)] bg-[var(--sf)] p-4">
            <div className="flex items-start gap-3">
              <LogoMark bg="#635BFF">
                <span className="text-[13px] font-black text-white">S</span>
              </LogoMark>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">Stripe</div>
                <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
                  {data.stripe.platformConfigured
                    ? `Collect deposits · ${data.stripe.mode} mode`
                    : data.stripe.hint || "Not available yet"}
                </p>
                <div className="mt-3">
                  <Link href={data.stripe.paymentsUrl} className="sw-btn sw-btn-primary">
                    Open payments
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Partner apps</h2>
        <p className="mb-4 text-[13px]" style={{ color: "var(--mut)" }}>
          Connect calendars, video, and marketing tools for your bookings.
        </p>

        {cards.length === 0 ? (
          <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
            No partner apps are available yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ key, row, meta }) => {
              const pending = busy === key;
              return (
                <div
                  key={key}
                  className="flex flex-col rounded-2xl border border-[var(--ln)] bg-[var(--sf)] p-4 transition hover:border-[color-mix(in_srgb,var(--ac)_35%,var(--ln))]"
                >
                  <div className="flex items-start gap-3">
                    {meta.logo}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <b className="truncate text-[14px]">{meta.label}</b>
                        <em
                          className={`sw-tag shrink-0 ${
                            row.status === "error"
                              ? "sw-tag-bad"
                              : row.connected
                                ? "sw-tag-ok"
                                : "sw-tag-muted"
                          }`}
                        >
                          {row.status === "error"
                            ? "Reconnect"
                            : row.connected
                              ? "Connected"
                              : "Off"}
                        </em>
                      </div>
                      <p className="m-0 mt-1 text-[12.5px] leading-snug" style={{ color: "var(--mut)" }}>
                        {row.connected && row.externalAccountEmail
                          ? row.externalAccountEmail
                          : meta.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {row.connected ? (
                      <>
                        <button
                          type="button"
                          className="sw-btn"
                          disabled={pending}
                          onClick={() => {
                            setConnectError("");
                            setConnectProvider(key);
                          }}
                        >
                          {pending ? "…" : "Reconnect"}
                        </button>
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
                        onClick={() => {
                          setConnectError("");
                          setConnectProvider(key);
                        }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="sw-card">
        <h2 className="mb-1 text-[15px] font-extrabold">Tracking</h2>
        <p className="mb-4 text-[13px]" style={{ color: "var(--mut)" }}>
          Measure visits on your public booking page.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--ln)] bg-[var(--sf)] p-4">
            <div className="flex items-center gap-3">
              <LogoMark bg="#F9AB00">
                <span className="text-[12px] font-black text-[#1a1203]">GA4</span>
              </LogoMark>
              <div>
                <div className="font-extrabold">Google Analytics</div>
                <p className="m-0 text-[12px]" style={{ color: "var(--mut)" }}>
                  Measurement ID
                </p>
              </div>
            </div>
            <input
              className="mt-3 w-full rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-mono text-[13px] font-semibold"
              value={ga4Id}
              onChange={(e) => setGa4Id(e.target.value)}
              placeholder="G-XXXXXXXX"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="rounded-2xl border border-[var(--ln)] bg-[var(--sf)] p-4">
            <div className="flex items-center gap-3">
              <LogoMark bg="#1877F2">
                <span className="text-[12px] font-black text-white">Meta</span>
              </LogoMark>
              <div>
                <div className="font-extrabold">Meta Pixel</div>
                <p className="m-0 text-[12px]" style={{ color: "var(--mut)" }}>
                  Pixel ID
                </p>
              </div>
            </div>
            <input
              className="mt-3 w-full rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-mono text-[13px] font-semibold"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="123456789012345"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
        <button
          type="button"
          className="sw-btn sw-btn-primary mt-4"
          disabled={trackingBusy}
          onClick={() => void saveTracking()}
        >
          {trackingBusy ? "Saving…" : "Save tracking"}
        </button>
      </section>
    </div>
  );
}
