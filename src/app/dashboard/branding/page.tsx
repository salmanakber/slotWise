"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookingWidget, type BrandingPreview } from "@/components/widget/booking-widget";
import { LOADER_STYLES, THEMES } from "@/lib/themes";
import {
  applySiteThemeToDocument,
  broadcastSiteTheme,
  resolveSiteTheme,
} from "@/lib/site-theme";
import { cn } from "@/lib/utils";

export default function BrandingPage() {
  const [publicKey, setPublicKey] = useState("");
  const [themeKey, setThemeKey] = useState("amber-light");
  const [accent, setAccent] = useState("#f5a000");
  const [inkColor, setInkColor] = useState("#0f1b2d");
  const [radius, setRadius] = useState(14);
  const [font, setFont] = useState("Manrope");
  const [layout, setLayout] = useState<"INLINE" | "POPUP" | "FLOATING">("INLINE");
  const [name, setName] = useState("Your business");
  const [showLoader, setShowLoader] = useState(true);
  const [loaderStyle, setLoaderStyle] = useState("PULSE");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showPrice, setShowPrice] = useState(true);
  const [showDuration, setShowDuration] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [ga4MeasurementId, setGa4MeasurementId] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [widgetKey, setWidgetKey] = useState(0);

  const theme = useMemo(() => THEMES.find((t) => t.key === themeKey) ?? THEMES[0], [themeKey]);

  const brandingPreview = useMemo<BrandingPreview>(
    () => ({
      themeKey,
      accent,
      inkColor,
      radius,
      font,
      layout,
      businessName: name,
      showStaff,
      showPrice,
      showDuration,
      showBadge,
      showLoader,
      loaderStyle,
      theme: {
        bg: theme.bg,
        panel: theme.panel,
        ink: inkColor || theme.ink,
        line: theme.line,
      },
    }),
    [
      themeKey,
      accent,
      inkColor,
      radius,
      font,
      layout,
      name,
      showStaff,
      showPrice,
      showDuration,
      showBadge,
      showLoader,
      loaderStyle,
      theme,
    ],
  );

  function pushWorkspaceTheme(next?: {
    themeKey?: string;
    accent?: string;
    inkColor?: string;
    font?: string;
    radius?: number;
  }) {
    const tokens = resolveSiteTheme({
      themeKey: next?.themeKey ?? themeKey,
      accent: next?.accent ?? accent,
      inkColor: next?.inkColor ?? inkColor,
      font: next?.font ?? font,
      radius: next?.radius ?? radius,
    });
    applySiteThemeToDocument(tokens);
    broadcastSiteTheme(tokens, { preview: true });
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/site/branding", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.publicKey) setPublicKey(data.publicKey);
        if (data.themeKey) setThemeKey(data.themeKey);
        if (data.accent) setAccent(data.accent);
        if (data.inkColor) setInkColor(data.inkColor);
        if (typeof data.radius === "number") setRadius(data.radius);
        if (data.font) setFont(data.font);
        if (data.layout === "INLINE" || data.layout === "POPUP" || data.layout === "FLOATING") {
          setLayout(data.layout);
        }
        if (data.businessName) setName(data.businessName);
        if (typeof data.showLoader === "boolean") setShowLoader(data.showLoader);
        if (data.loaderStyle) setLoaderStyle(data.loaderStyle);
        if (typeof data.showPrice === "boolean") setShowPrice(data.showPrice);
        if (typeof data.showDuration === "boolean") setShowDuration(data.showDuration);
        if (typeof data.showStaff === "boolean") setShowStaff(data.showStaff);
        if (typeof data.showBadge === "boolean") setShowBadge(data.showBadge);
        if (typeof data.ga4MeasurementId === "string") setGa4MeasurementId(data.ga4MeasurementId);
        else if (data.ga4MeasurementId === null) setGa4MeasurementId("");
        if (typeof data.metaPixelId === "string") setMetaPixelId(data.metaPixelId);
        else if (data.metaPixelId === null) setMetaPixelId("");
        const tokens = resolveSiteTheme(data);
        applySiteThemeToDocument(tokens);
        broadcastSiteTheme(tokens, { preview: true });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function pickTheme(key: string) {
    const t = THEMES.find((x) => x.key === key);
    if (!t) return;
    setThemeKey(t.key);
    setAccent(t.accent);
    setInkColor(t.ink);
    setRadius(t.radius);
    setFont(t.font);
    pushWorkspaceTheme({
      themeKey: t.key,
      accent: t.accent,
      inkColor: t.ink,
      font: t.font,
      radius: t.radius,
    });
  }

  async function saveBranding() {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/site/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeKey,
          accent,
          inkColor,
          radius,
          font,
          layout,
          businessName: name,
          showStaff,
          showPrice,
          showDuration,
          showBadge,
          showLoader,
          loaderStyle,
          ga4MeasurementId: ga4MeasurementId.trim() || null,
          metaPixelId: metaPixelId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Save failed — is Postgres running?");
      }
      const data = await res.json();
      const tokens = resolveSiteTheme(data);
      applySiteThemeToDocument(tokens);
      broadcastSiteTheme(tokens, { committed: true });
      setWidgetKey((k) => k + 1);
      setSavedMsg("Saved. Workspace and booking page now use this theme.");
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="grid gap-3.5 content-start">
        <section className="sw-card">
          <h2 className="mb-1 text-[15px] font-extrabold">Theme and color</h2>
          <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
            Preview updates the workspace instantly. Click Save to keep it.
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTheme(t.key)}
                className={cn(
                  "grid gap-2 rounded-xl border p-2 text-left text-[13px] font-semibold",
                  themeKey === t.key
                    ? "border-[var(--ac)] shadow-[0_0_0_2px_var(--ac)]"
                    : "border-[var(--ln)]",
                )}
              >
                <i
                  className="block h-11 rounded-lg border"
                  style={{
                    borderColor: `${t.accent}30`,
                    background: `linear-gradient(${t.accent}, ${t.accent}) 12px 28px / 34px 8px no-repeat, linear-gradient(${t.ink}, ${t.ink}) 12px 12px / 54% 6px no-repeat, ${t.bg}`,
                  }}
                />
                {t.name}
              </button>
            ))}
          </div>
          <Row label="Accent color">
            <input
              type="color"
              value={accent}
              onChange={(e) => {
                const v = e.target.value;
                setAccent(v);
                pushWorkspaceTheme({ accent: v });
              }}
              aria-label="Accent"
            />
          </Row>
          <Row label="Text color">
            <input
              type="color"
              value={inkColor}
              onChange={(e) => {
                const v = e.target.value;
                setInkColor(v);
                pushWorkspaceTheme({ inkColor: v });
              }}
              aria-label="Text color"
            />
          </Row>
        </section>

        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Shape and type</h2>
          <Row label="Corner radius">
            <input
              type="range"
              min={0}
              max={28}
              value={radius}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRadius(v);
                pushWorkspaceTheme({ radius: v });
              }}
            />
            <span className="text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
              {radius}px
            </span>
          </Row>
          <Row label="Font">
            <select
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={font}
              onChange={(e) => {
                const v = e.target.value;
                setFont(v);
                pushWorkspaceTheme({ font: v });
              }}
            >
              {["Manrope", "Figtree", "Sora", "Young Serif", "Match my site"].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Widget layout">
            <select
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={layout}
              onChange={(e) => setLayout(e.target.value as typeof layout)}
            >
              <option value="INLINE">Inline</option>
              <option value="POPUP">Popup</option>
              <option value="FLOATING">Floating button</option>
            </select>
          </Row>
          <Row label="Business name">
            <input
              className="w-full max-w-[220px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Row>
        </section>

        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Widget options</h2>
          <Toggle label="Show prices" on={showPrice} set={setShowPrice} />
          <Toggle label="Show duration" on={showDuration} set={setShowDuration} />
          <Toggle label="Show staff picker" on={showStaff} set={setShowStaff} />
          <Toggle label="Show Slotwise badge" on={showBadge} set={setShowBadge} />
          <Toggle label="Show loading animation" on={showLoader} set={setShowLoader} />
          <Row label="Loader style">
            <select
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={loaderStyle}
              onChange={(e) => setLoaderStyle(e.target.value)}
              disabled={!showLoader}
            >
              {LOADER_STYLES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Row>
        </section>

        <section className="sw-card">
          <h2 className="mb-1 text-[15px] font-extrabold">Tracking</h2>
          <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
            Loads on your public booking page and embeds. Google doesn’t offer a one-click “Connect GA4”
            for Measurement IDs — paste the ID from Analytics Admin.
          </p>
          <Row label="GA4 Measurement ID">
            <input
              className="w-full max-w-[220px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-mono text-[13px]"
              value={ga4MeasurementId}
              onChange={(e) => setGa4MeasurementId(e.target.value)}
              placeholder="G-XXXXXXXX"
              autoComplete="off"
              spellCheck={false}
            />
          </Row>
          <p className="mb-3 text-[12px]" style={{ color: "var(--mut)" }}>
            Find it in{" "}
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noreferrer"
              className="font-extrabold underline"
            >
              Google Analytics
            </a>{" "}
            → Admin → Data streams → your web stream → Measurement ID.
          </p>
          <Row label="Meta Pixel ID">
            <input
              className="w-full max-w-[220px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2 font-mono text-[13px]"
              value={metaPixelId}
              onChange={(e) => setMetaPixelId(e.target.value)}
              placeholder="123456789012345"
              autoComplete="off"
              spellCheck={false}
            />
          </Row>
          <p className="m-0 text-[12px]" style={{ color: "var(--mut)" }}>
            From{" "}
            <a
              href="https://business.facebook.com/events_manager"
              target="_blank"
              rel="noreferrer"
              className="font-extrabold underline"
            >
              Meta Events Manager
            </a>{" "}
            → Data sources → your Pixel → Pixel ID (numbers only).
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="sw-btn sw-btn-primary"
            disabled={saving}
            onClick={() => void saveBranding()}
          >
            {saving ? "Saving…" : "Save branding"}
          </button>
          {savedMsg ? (
            <span className="text-[13px] font-semibold text-[var(--at)]">{savedMsg}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3.5 content-start">
        <section className="sw-card !p-3 sm:!p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="m-0 text-[15px] font-extrabold">Live booking preview</h2>
              <p className="m-0 mt-0.5 text-[12px]" style={{ color: "var(--mut)" }}>
                Real calendar widget — same as your public booking page
              </p>
            </div>
            {publicKey ? (
              <Link href={`/book/${publicKey}`} className="sw-btn" target="_blank">
                Open full page
              </Link>
            ) : null}
          </div>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{
              borderColor: theme.line,
              background: theme.bg,
              minHeight: 420,
            }}
          >
            {publicKey ? (
              <BookingWidget
                key={`${publicKey}-${widgetKey}`}
                publicKey={publicKey}
                embed
                brandingPreview={brandingPreview}
              />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center text-[13px]" style={{ color: "var(--mut)" }}>
                Loading widget…
              </div>
            )}
          </div>
        </section>

        <section className="sw-card">
          <h2 className="mb-1 text-[15px] font-extrabold">Add to your website</h2>
          <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
            In Webflow Designer, open Slotwise and choose Place on canvas. Theme changes there sync
            here automatically.
          </p>
          <div className="flex flex-wrap gap-2">
            {publicKey ? (
              <Link href={`/book/${publicKey}`} className="sw-btn sw-btn-primary">
                Open live preview
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <b>{label}</b>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  on,
  set,
}: {
  label: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <b>{label}</b>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => set(!on)}
        className={`relative h-6 w-[42px] rounded-full ${on ? "bg-[var(--ac)]" : "bg-[var(--ln)]"}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition ${
            on ? "translate-x-[18px]" : ""
          }`}
        />
      </button>
    </div>
  );
}
