"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  siteName: string;
  publicKey: string;
  designerAppHref: string;
};

/**
 * Post-OAuth success — light “Done” screen that opens Designer with Slotwise.
 */
export function InstallSuccess({ siteName, publicKey, designerAppHref }: Props) {
  const [opened, setOpened] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const mark = window.setTimeout(() => setDone(true), 280);
    return () => window.clearTimeout(mark);
  }, []);

  useEffect(() => {
    if (!designerAppHref) return;
    const t = window.setTimeout(() => {
      try {
        const w = window.open(designerAppHref, "slotwise-webflow-designer");
        setOpened(Boolean(w));
      } catch {
        setOpened(false);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [designerAppHref]);

  return (
    <div className="install-done text-center">
      <style>{`
        @keyframes sw-done-pop {
          0% { opacity: 0; transform: scale(.72); }
          60% { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sw-done-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sw-done-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        .sw-done-ring {
          animation: sw-done-pop .55s cubic-bezier(.2,.9,.2,1) both;
        }
        .sw-done-check {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: sw-done-draw .55s .35s ease forwards;
        }
        .sw-done-rise { animation: sw-done-rise .55s .2s cubic-bezier(.2,.8,.2,1) both; }
        .sw-done-rise-2 { animation: sw-done-rise .55s .32s cubic-bezier(.2,.8,.2,1) both; }
        .sw-done-rise-3 { animation: sw-done-rise .55s .44s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .sw-done-ring, .sw-done-check, .sw-done-rise, .sw-done-rise-2, .sw-done-rise-3 {
            animation: none !important;
          }
          .sw-done-check { stroke-dashoffset: 0; }
        }
      `}</style>

      <div
        className="sw-done-ring mx-auto grid h-[88px] w-[88px] place-items-center rounded-full"
        style={{
          background: "linear-gradient(160deg, #fff7e6, #ffffff)",
          boxShadow: "0 18px 40px rgba(245,160,0,.22), inset 0 0 0 1px rgba(245,160,0,.28)",
        }}
      >
        <svg width="44" height="44" viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="20" fill="none" stroke="#f5a000" strokeWidth="2.5" opacity="0.25" />
          <path
            className="sw-done-check"
            d="M14 24.5 21 31.5 34 17"
            fill="none"
            stroke="#f5a000"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="sw-done-rise mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#c47d00]">
        {done ? "Completed" : "Finishing…"}
      </p>
      <h1
        className="sw-done-rise-2 mt-2 text-[clamp(1.75rem,4vw,2.35rem)] font-extrabold tracking-tight text-[#152033]"
        style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
      >
        You’re all set
      </h1>
      <p className="sw-done-rise-2 mx-auto mt-3 max-w-[36ch] text-[14px] leading-relaxed text-[#5c6b7e]">
        <strong className="font-extrabold text-[#152033]">{siteName || "Your Webflow site"}</strong>{" "}
        is connected to Slotwise.
        {opened
          ? " Designer is opening with the Slotwise app."
          : " Open Designer below to place your booking widget."}
      </p>

      {publicKey ? (
        <div className="sw-done-rise-3 mx-auto mt-5 max-w-sm rounded-2xl border border-[#e8edf4] bg-[#f7f9fc] px-4 py-3 text-[12.5px] text-[#5c6b7e]">
          Booking key{" "}
          <code className="font-mono font-extrabold text-[#c47d00]">{publicKey}</code>
        </div>
      ) : null}

      <div className="sw-done-rise-3 mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href={designerAppHref}
          target="slotwise-webflow-designer"
          rel="noreferrer"
          className="inline-flex rounded-full bg-[#f5a000] px-7 py-3.5 text-[13px] font-extrabold text-[#1a1203] shadow-[0_14px_28px_rgba(245,160,0,.28)] transition hover:brightness-105"
          onClick={() => setOpened(true)}
        >
          Open in Designer
        </a>
        {publicKey ? (
          <Link
            href={`/book/${publicKey}`}
            className="inline-flex rounded-full border border-[#d7dee8] bg-white px-7 py-3.5 text-[13px] font-bold text-[#152033] transition hover:border-[#f5a000]/50"
          >
            Preview booking page
          </Link>
        ) : null}
      </div>

      <p className="sw-done-rise-3 mx-auto mt-6 max-w-[40ch] text-[12px] leading-relaxed text-[#8a96a8]">
        Tip: Slotwise opens in mobile panel by default — switch to desktop from the sidebar anytime.
      </p>
    </div>
  );
}
