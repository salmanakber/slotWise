"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Loads GA4 gtag when a Measurement ID is saved under Integrations → Tracking. */
export function Ga4Script({ measurementId }: { measurementId?: string | null }) {
  const id = measurementId?.trim().toUpperCase() || "";
  const valid = /^G-[A-Z0-9]+$/.test(id);

  useEffect(() => {
    if (!valid || typeof window === "undefined") return;
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
    window.gtag("js", new Date());
    window.gtag("config", id, { send_page_view: true });
  }, [id, valid]);

  if (!valid) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
      strategy="afterInteractive"
    />
  );
}
