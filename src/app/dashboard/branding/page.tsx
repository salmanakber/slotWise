"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLoader } from "@/components/brand/loader";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { LOADER_STYLES, THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

export default function BrandingPage() {
  const [themeKey, setThemeKey] = useState("amber-light");
  const [accent, setAccent] = useState("#f5a000");
  const [inkColor, setInkColor] = useState("#0f1b2d");
  const [radius, setRadius] = useState(14);
  const [font, setFont] = useState("Manrope");
  const [layout, setLayout] = useState<"INLINE" | "POPUP" | "FLOATING">("INLINE");
  const [name, setName] = useState("Your business");
  const [showLoader, setShowLoader] = useState(true);
  const [loaderStyle, setLoaderStyle] = useState("PULSE");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showPrice, setShowPrice] = useState(true);
  const [showDuration, setShowDuration] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showBadge, setShowBadge] = useState(true);

  const theme = useMemo(() => THEMES.find((t) => t.key === themeKey) ?? THEMES[0], [themeKey]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/sites/${DEMO_PUBLIC_KEY}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.branding) return;
        const b = data.branding;
        if (b.themeKey) setThemeKey(b.themeKey);
        if (b.accent) setAccent(b.accent);
        if (b.inkColor) setInkColor(b.inkColor);
        else if (b.theme?.ink) setInkColor(b.theme.ink);
        if (typeof b.radius === "number") setRadius(b.radius);
        if (b.font) setFont(b.font);
        if (b.layout === "INLINE" || b.layout === "POPUP" || b.layout === "FLOATING") {
          setLayout(b.layout);
        }
        if (b.businessName) setName(b.businessName);
        if (typeof b.showLoader === "boolean") setShowLoader(b.showLoader);
        if (b.loaderStyle) setLoaderStyle(b.loaderStyle);
        if (typeof b.showPrice === "boolean") setShowPrice(b.showPrice);
        if (typeof b.showDuration === "boolean") setShowDuration(b.showDuration);
        if (typeof b.showStaff === "boolean") setShowStaff(b.showStaff);
        if (typeof b.showBadge === "boolean") setShowBadge(b.showBadge);
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
    // Preview workspace chrome immediately; Save persists for next visit
    const root = document.documentElement;
    root.style.setProperty("--bg", t.bg);
    root.style.setProperty("--pn", t.panel);
    root.style.setProperty("--ink", t.ink);
    root.style.setProperty("--ln", t.line);
    root.style.setProperty("--ac", t.accent);
    root.style.setProperty("--at", t.accent);
    root.style.setProperty("--sf", `color-mix(in srgb, ${t.accent} 16%, #ffffff)`);
  }

  function playLoader() {
    if (!showLoader) return;
    setLoading(true);
    window.setTimeout(() => setLoading(false), 2000);
  }

  async function saveBranding() {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch(`/api/v1/sites/${DEMO_PUBLIC_KEY}/branding`, {
        method: "PUT",
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
        }),
      });
      if (!res.ok) throw new Error("Save failed — is Postgres running?");
      setSavedMsg("Saved. Live on the public booking page and workspace.");
      window.dispatchEvent(new Event("slotwise:branding"));
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="grid gap-3.5 content-start">
        <section className="sw-card">
          <h2 className="mb-1 text-[15px] font-extrabold">Theme and color</h2>
          <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
            Pick one of 8 themes, then fine-tune accent and text colors.
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTheme(t.key)}
                className={cn(
                  "grid gap-2 rounded-xl border p-2 text-left text-[13px] font-semibold",
                  themeKey === t.key ? "border-[var(--ac)] shadow-[0_0_0_2px_var(--ac)]" : "border-[var(--ln)]",
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
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Accent" />
          </Row>
          <Row label="Text color">
            <input
              type="color"
              value={inkColor}
              onChange={(e) => setInkColor(e.target.value)}
              aria-label="Text color"
            />
          </Row>
        </section>

        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Shape and type</h2>
          <Row label="Corner radius">
            <input type="range" min={0} max={28} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </Row>
          <Row label="Font">
            <select value={font} onChange={(e) => setFont(e.target.value)} className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2">
              {["Match my site", "Manrope", "Figtree", "Sora", "Young Serif"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Row>
          <Row label="How it opens">
            <Seg
              value={layout}
              onChange={(v) => setLayout(v as typeof layout)}
              options={[
                ["INLINE", "Inline"],
                ["POPUP", "Popup"],
                ["FLOATING", "Floating"],
              ]}
            />
          </Row>
          <Row label="Business name" hint="Shown at the top of the widget">
            <input
              className="rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Row>
          <Toggle label="Staff picker" on={showStaff} set={setShowStaff} />
          <Toggle label="Show prices" on={showPrice} set={setShowPrice} />
          <Toggle label="Show durations" on={showDuration} set={setShowDuration} />
          <Toggle label="Show “Powered by Slotwise”" on={showBadge} set={setShowBadge} />
        </section>

        <section className="sw-card">
          <h2 className="mb-1 text-[15px] font-extrabold">Brand loader</h2>
          <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
            Shown while slots load. Uses Slotwise mark colors, tinted by your accent.
          </p>
          <Toggle label="Show brand loader" hint="While availability and payment steps load" on={showLoader} set={setShowLoader} />
          <Row label="Animation" hint="Custom Lottie upload comes next">
            <Seg
              value={loaderStyle}
              onChange={setLoaderStyle}
              options={LOADER_STYLES.map((l) => [l.key, l.label])}
            />
          </Row>
          <Row label="Preview loader" hint="Plays over the live preview for 2 seconds">
            <button type="button" className="sw-btn" onClick={playLoader}>
              Play preview
            </button>
          </Row>
        </section>
      </div>

      <div className="grid gap-3.5 content-start xl:sticky xl:top-4 xl:self-start">
        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Live preview</h2>
          <div
            className="relative min-h-[430px] overflow-hidden rounded-[14px] border border-[var(--ln)] bg-[var(--bg)] p-4"
            style={{
              ["--pbg" as string]: theme.bg,
              ["--pink" as string]: inkColor || theme.ink,
              ["--pln" as string]: theme.line,
              ["--pac" as string]: accent,
              ["--pr" as string]: `${radius}px`,
              fontFamily: font === "Match my site" ? "inherit" : `${font}, system-ui, sans-serif`,
            }}
          >
            {loading && showLoader ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--pbg)_88%,transparent)] backdrop-blur-[2px]">
                <BrandLoader style={loaderStyle} accent={accent} />
              </div>
            ) : null}

            {layout === "FLOATING" ? (
              <button
                type="button"
                className="absolute bottom-4 right-4 rounded-full px-5 py-3 font-extrabold text-[var(--on)]"
                style={{ background: accent }}
              >
                Book now
              </button>
            ) : (
              <div
                className="relative z-[1] mx-auto mt-3 max-w-[340px] border p-[calc(12px*1.4)] shadow-[0_14px_34px_rgba(0,0,0,.16)]"
                style={{
                  background: "var(--pbg)",
                  color: "var(--pink)",
                  borderColor: "var(--pln)",
                  borderRadius: "var(--pr)",
                }}
              >
                <div className="mb-2.5 flex items-center gap-2 font-extrabold">
                  <i className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: accent }} />
                  {name}
                </div>
                <button
                  type="button"
                  className="mb-1.5 flex w-full items-center justify-between rounded-[calc(var(--pr)-4px)] border p-3 text-left"
                  style={{ borderColor: accent, background: `color-mix(in srgb, ${accent} 16%, var(--pbg))` }}
                >
                  <span>
                    Sample appointment
                    {showDuration ? <small className="block text-xs opacity-70">2 h</small> : null}
                    {showStaff ? <small className="block text-xs opacity-70">with Lena</small> : null}
                  </span>
                  {showPrice ? <b>$120</b> : null}
                </button>
                <div className="my-2.5 flex gap-1.5">
                  {["Mon", "Tue", "Wed", "Thu"].map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      className="flex-1 rounded-[calc(var(--pr)-6px)] border py-2 text-[13px]"
                      style={
                        i === 2
                          ? { background: accent, color: "#1a1203", borderColor: accent }
                          : { borderColor: "var(--pln)", background: "transparent" }
                      }
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="mb-3 grid grid-cols-3 gap-1.5">
                  {["09:00", "10:00", "11:30"].map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      className="rounded-[calc(var(--pr)-6px)] border py-2 text-[13px]"
                      style={
                        i === 1
                          ? { background: accent, color: "#1a1203", borderColor: accent }
                          : { borderColor: "var(--pln)", background: "transparent" }
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="w-full rounded-[calc(var(--pr)-4px)] border-[1.5px] py-3 font-extrabold"
                  style={{ background: accent, borderColor: accent, color: "#1a1203" }}
                >
                  Confirm booking
                </button>
                {showBadge ? (
                  <span className="mt-2.5 block text-center text-[11.5px] opacity-60">Powered by Slotwise</span>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="sw-card">
          <h2 className="mb-1 text-[15px] font-extrabold">Add to your website</h2>
          <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
            In Webflow Designer, open Slotwise and choose Place on canvas. Or open a live preview below.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className="sw-btn sw-btn-primary" disabled={saving} onClick={saveBranding}>
              {saving ? "Saving…" : "Save branding"}
            </button>
            <Link href={`/book/${DEMO_PUBLIC_KEY}`} className="sw-btn">
              Open live preview
            </Link>
          </div>
          {savedMsg ? <p className="mb-3 text-[13px] font-semibold text-[var(--at)]">{savedMsg}</p> : null}
        </section>
      </div>
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
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  set,
}: {
  label: string;
  hint?: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <Row label={label} hint={hint}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => set(!on)}
        className={cn(
          "relative h-6 w-[42px] rounded-full border-0 transition",
          on ? "bg-[var(--ac)]" : "bg-[var(--ln)]",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition",
            on && "translate-x-[18px]",
          )}
        />
      </button>
    </Row>
  );
}

function Seg({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string] | readonly [string, string]>;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-full border border-[var(--ln)] bg-[var(--bg)] p-[3px]">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
            value === v ? "bg-[var(--ac)] text-[var(--on)]" : "text-[var(--mut)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
