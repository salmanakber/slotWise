/**
 * In-page Slotwise booking runtime for Webflow Custom Code.
 * Mounts React into [data-slotwise-widget] — no iframes.
 */
import { createRoot, type Root } from "react-dom/client";
import { BookingWidget } from "@/components/widget/booking-widget";
import cssText from "./embed.generated.css";

declare global {
  interface Window {
    __slotwiseBooted?: boolean;
    __slotwiseRoots?: Map<Element, Root>;
  }
}

const STYLE_ID = "slotwise-embed-css";
const APP_ORIGIN = "https://slotwise.hindaralabs.com";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}

function publicKeyFrom(el: Element): string | null {
  const raw =
    el.getAttribute("data-site") ||
    el.getAttribute("data-slotwise-widget") ||
    "";
  if (!raw || raw === "1") return null;
  if (/^sw_[a-zA-Z0-9]+$/.test(raw)) return raw;
  const fromBook = raw.match(/\/book\/(sw_[a-zA-Z0-9]+)/);
  return fromBook ? fromBook[1] : null;
}

function stripLegacyIframes(el: HTMLElement) {
  const frames = el.querySelectorAll("iframe");
  frames.forEach((frame) => {
    const src = frame.getAttribute("src") || "";
    if (/slotwise\.hindaralabs\.com\/book\//i.test(src) || /\/book\/sw_/i.test(src)) {
      frame.remove();
    }
  });
}

function mountOne(el: HTMLElement, apiBase: string) {
  if (el.getAttribute("data-slotwise-mounted") === "1") return;
  const publicKey = publicKeyFrom(el);
  if (!publicKey) return;

  stripLegacyIframes(el);
  // Clear Designer placeholder text/nodes before React mount
  el.innerHTML = "";
  el.setAttribute("data-slotwise-mounted", "1");
  el.classList.add("slotwise-host");
  el.style.width = "100%";
  el.style.maxWidth = "100%";
  el.style.minWidth = "0";
  el.style.boxSizing = "border-box";

  const rootEl = document.createElement("div");
  rootEl.className = "slotwise-root";
  el.appendChild(rootEl);

  const root = createRoot(rootEl);
  if (!window.__slotwiseRoots) window.__slotwiseRoots = new Map();
  window.__slotwiseRoots.set(el, root);

  root.render(
    <BookingWidget publicKey={publicKey} host="inline" apiBase={apiBase} />,
  );
}

/** Convert leftover Designer iframes (old installs) into in-page mounts. */
function migrateOrphanIframes(apiBase: string) {
  const frames = document.querySelectorAll("iframe");
  frames.forEach((iframe) => {
    const src = iframe.getAttribute("src") || "";
    const m = src.match(/\/book\/(sw_[a-zA-Z0-9]+)/);
    if (!m) return;
    if (iframe.closest("[data-slotwise-mounted='1']")) return;
    const key = m[1];
    const wrap = document.createElement("div");
    wrap.setAttribute("data-slotwise-widget", key);
    wrap.setAttribute("data-site", key);
    wrap.style.width = "100%";
    wrap.style.maxWidth = "100%";
    iframe.replaceWith(wrap);
    mountOne(wrap, apiBase);
  });
}

function markRuntimeReady() {
  try {
    document.documentElement.setAttribute("data-runtime-ready", "slotwise");
    if (document.body) document.body.setAttribute("data-runtime-ready", "slotwise");
  } catch {
    /* ignore */
  }
}

function boot() {
  if (window.__slotwiseBooted) return;
  window.__slotwiseBooted = true;

  ensureStyles();

  const script = document.currentScript as HTMLScriptElement | null;
  const base =
    (script?.src && script.src.replace(/\/embed\/widget\.js(?:\.map)?.*$/, "")) ||
    APP_ORIGIN;

  const nodes = document.querySelectorAll<HTMLElement>("[data-slotwise-widget]");
  nodes.forEach((el) => mountOne(el, base));
  migrateOrphanIframes(base);
  markRuntimeReady();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
