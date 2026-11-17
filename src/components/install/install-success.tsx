"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  siteName: string;
  publicKey: string;
  designerAppHref: string;
};

/**
 * Post-OAuth success screen shown in the auth popup / new tab.
 * Auto-opens Designer with the Slotwise app launched; user can close this window.
 */
export function InstallSuccess({ siteName, publicKey, designerAppHref }: Props) {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!designerAppHref) return;
    const t = window.setTimeout(() => {
      try {
        // Prefer focusing an existing Designer tab when possible
        const w = window.open(designerAppHref, "slotwise-webflow-designer");
        if (w) setOpened(true);
        else {
          // Popup blocked — fall through to visible button
          setOpened(false);
        }
      } catch {
        setOpened(false);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [designerAppHref]);

  return (
    <>
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f5a000] text-xl font-black text-[#1a1203]">
        ✓
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">All set</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#9aa7b8]">
        {siteName ? <strong className="text-white">{siteName}</strong> : "Your Webflow site"} is connected
        to Slotwise.
      </p>
      {publicKey ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          Booking key: <code className="font-bold text-[#f5a000]">{publicKey}</code>
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl border border-[#f5a000]/35 bg-[#f5a000]/10 px-4 py-4 text-sm leading-relaxed text-[#f4f1ea]">
        <p className="font-extrabold text-[#f5a000]">You can close this window</p>
        <p className="mt-1.5 text-[#c9d0da]">
          {opened
            ? "We opened Webflow Designer with the Slotwise app. Switch back to that tab — this one is done."
            : "Return to Webflow Designer. Slotwise should open automatically, or use the button below."}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={designerAppHref}
          target="slotwise-webflow-designer"
          rel="noreferrer"
          className="rounded-full bg-[#f5a000] px-6 py-3 text-sm font-extrabold text-[#1a1203]"
          onClick={() => setOpened(true)}
        >
          Open Slotwise in Designer
        </a>
        {publicKey ? (
          <Link
            href={`/book/${publicKey}?embed=1`}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold"
          >
            Preview booking
          </Link>
        ) : null}
        <button
          type="button"
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-[#c9d0da]"
          onClick={() => {
            try {
              window.close();
            } catch {
              /* ignore */
            }
          }}
        >
          Close this window
        </button>
      </div>
    </>
  );
}
