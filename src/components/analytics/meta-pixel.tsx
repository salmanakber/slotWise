"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/** Loads Meta (Facebook) Pixel when a numeric Pixel ID is set on branding. */
export function MetaPixelScript({ pixelId }: { pixelId?: string | null }) {
  const id = pixelId?.trim().replace(/\s+/g, "") || "";
  const valid = /^\d{5,20}$/.test(id);

  useEffect(() => {
    if (!valid || typeof window === "undefined") return;
    if (typeof window.fbq === "function") {
      window.fbq("init", id);
      window.fbq("track", "PageView");
    }
  }, [id, valid]);

  if (!valid) return null;

  return (
    <>
      <Script id={`meta-pixel-${id}`} strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');
fbq('track','PageView');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
