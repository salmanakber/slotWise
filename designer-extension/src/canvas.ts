import { APP_URL } from "./api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wf(): any {
  return (window as unknown as { webflow?: unknown }).webflow;
}

export async function notify(type: "Success" | "Error" | "Info", message: string) {
  try {
    await wf()?.notify?.({ type, message });
  } catch {
    /* ignore */
  }
}

export async function detectWebflowSiteId(): Promise<string | null> {
  try {
    const info = await wf()?.getSiteInfo?.();
    return info?.siteId || info?.id || null;
  } catch {
    return null;
  }
}

export async function setExtensionLarge() {
  try {
    await wf()?.setExtensionSize?.("large");
  } catch {
    /* ignore */
  }
}

export async function getDesignerMode(): Promise<string | null> {
  try {
    if (typeof wf()?.getCurrentMode === "function") {
      return await wf().getCurrentMode();
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** True only when canvas element creation is allowed (Design mode). */
export async function canDesignOnCanvas(): Promise<{ ok: boolean; mode: string | null }> {
  const api = wf();
  let mode: string | null = null;
  try {
    if (typeof api?.getCurrentMode === "function") mode = await api.getCurrentMode();
  } catch {
    /* ignore */
  }

  try {
    if (typeof api?.canForAppMode === "function" && api.appModes?.canDesign) {
      const caps = await api.canForAppMode([api.appModes.canDesign]);
      return { ok: Boolean(caps?.canDesign), mode };
    }
    if (typeof api?.isMode === "function") {
      return { ok: Boolean(await api.isMode("design")), mode: mode ?? "design" };
    }
  } catch {
    /* ignore */
  }

  if (mode) return { ok: mode === "design", mode };
  return { ok: true, mode };
}

export function subscribeMode(cb: (mode: string | null) => void) {
  try {
    return wf()?.subscribe?.("currentappmode", (event: { mode?: string | null }) => {
      cb(event?.mode ?? null);
    });
  } catch {
    return () => undefined;
  }
}

export type InsertBookingOptions = {
  calendarStyle?: string | null;
};

/**
 * Place a mount node only — no externally hosted iframe (Marketplace rule).
 * Published pages load widget.js via Custom Code, which renders the booking UI in-page.
 */
export async function insertBookingMount(
  publicKey: string,
  options?: InsertBookingOptions,
) {
  const api = wf();
  if (!api?.getSelectedElement || !api?.elementPresets?.DOM) {
    throw new Error("Open this from Webflow Designer to embed on canvas");
  }

  const { ok, mode } = await canDesignOnCanvas();
  if (!ok) {
    const label = mode || "build";
    await notify(
      "Error",
      `Switch to Design mode to place elements. Current mode: ${label}.`,
    );
    throw new Error(
      `Canvas edits need Design mode. You’re in “${label}”. Click Design (D) in the Webflow toolbar, select a section, then try again.`,
    );
  }

  let parent = await api.getSelectedElement();
  if (!parent?.children) {
    const all = await api.getAllElements?.();
    parent =
      all?.find?.((e: { type?: string; children?: boolean }) => e.type === "Body" || e.children) ??
      null;
  }
  if (!parent?.append) throw new Error("Select a section or container on the canvas first");

  const calendarStyle = options?.calendarStyle || null;
  const canvasWide =
    typeof localStorage !== "undefined" && localStorage.getItem("slotwise-canvas-wide") === "1";
  const useWide =
    calendarStyle === "HORIZONTAL"
      ? true
      : calendarStyle === "MONTH" || calendarStyle === "WEEK"
        ? false
        : canvasWide;

  const wrapStyle = useWide
    ? "width:70%;max-width:70%;margin-left:auto;margin-right:auto;min-width:0;box-sizing:border-box;display:block;padding:20px;border:1px dashed #c5ceda;border-radius:16px;background:#f7f8fb;text-align:center;color:#5b6575;font:600 13px/1.45 system-ui,sans-serif;"
    : "width:100%;max-width:29.2rem;margin-left:auto;margin-right:auto;min-width:0;box-sizing:border-box;display:block;padding:20px;border:1px dashed #c5ceda;border-radius:16px;background:#f7f8fb;text-align:center;color:#5b6575;font:600 13px/1.45 system-ui,sans-serif;";

  try {
    if (typeof api.elementBuilder === "function") {
      const root = api.elementBuilder(api.elementPresets.DOM);
      root.setTag("div");
      root.setAttribute("data-slotwise-widget", publicKey);
      root.setAttribute("data-site", publicKey);
      if (calendarStyle) root.setAttribute("data-calendar-style", calendarStyle);
      // Placeholder styling only — live UI renders after Publish via hosted widget.js
      root.setAttribute("style", wrapStyle);
      root.setAttribute(
        "data-slotwise-placeholder",
        "Booking appears on publish (in-page, no iframe)",
      );
      await parent.append(root);
    } else {
      const wrap = await parent.append(api.elementPresets.DOM);
      await wrap.setTag("div");
      await wrap.setAttribute("data-slotwise-widget", publicKey);
      await wrap.setAttribute("data-site", publicKey);
      if (calendarStyle) await wrap.setAttribute("data-calendar-style", calendarStyle);
      await wrap.setAttribute("style", wrapStyle);
      await wrap.setAttribute(
        "data-slotwise-placeholder",
        "Booking appears on publish (in-page, no iframe)",
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/design/i.test(msg) && /build/i.test(msg)) {
      throw new Error(
        `Canvas edits need Design mode. You’re in Build mode. Switch to Design in the Webflow toolbar, then try again.`,
      );
    }
    throw e instanceof Error ? e : new Error(msg);
  }

  void APP_URL; // kept for future deep-links / docs
  await notify(
    "Success",
    useWide
      ? "Booking mount placed (Wide · publish to load in-page UI)"
      : "Booking mount placed — publish to load in-page UI",
  );
}

/** @deprecated Use insertBookingMount — iframes are not Marketplace-compliant. */
export const insertBookingIframe = insertBookingMount;

/**
 * Remove leftover Slotwise booking blocks from the current Designer page.
 */
export async function removeSlotwiseEmbedsFromCanvas() {
  const api = wf();
  if (!api?.getAllElements) {
    throw new Error("Open this from Webflow Designer to clean the canvas");
  }
  const { ok } = await canDesignOnCanvas();
  if (!ok) {
    throw new Error("Switch to Design mode to remove booking widgets from the page");
  }

  const all = (await api.getAllElements()) as Array<{
    type?: string;
    remove?: () => Promise<unknown>;
    getAttribute?: (name: string) => Promise<string | null>;
    getAttributes?: () => Promise<Record<string, string> | Array<{ name: string; value: string }>>;
  }>;

  let removed = 0;
  for (const el of all) {
    let isSlotwise = false;
    try {
      if (typeof el.getAttribute === "function") {
        const mark =
          (await el.getAttribute("data-slotwise-widget")) ||
          (await el.getAttribute("data-site")) ||
          (await el.getAttribute("src"));
        if (
          mark &&
          (/slotwise/i.test(String(mark)) ||
            /\/book\//i.test(String(mark)) ||
            String(mark).startsWith("sw_"))
        ) {
          isSlotwise = true;
        }
      } else if (typeof el.getAttributes === "function") {
        const attrs = await el.getAttributes();
        const flat = Array.isArray(attrs)
          ? Object.fromEntries(attrs.map((a) => [a.name, a.value]))
          : attrs || {};
        const blob = `${flat["data-slotwise-widget"] || ""} ${flat["data-site"] || ""} ${flat.src || ""}`;
        if (/slotwise|\/book\/|sw_/i.test(blob)) isSlotwise = true;
      }
    } catch {
      /* ignore attribute read failures */
    }

    if (!isSlotwise) continue;
    try {
      if (typeof el.remove === "function") {
        await el.remove();
        removed += 1;
      }
    } catch {
      /* ignore single element failures */
    }
  }

  if (removed > 0) {
    await notify("Success", `Removed ${removed} Slotwise block${removed === 1 ? "" : "s"} from this page`);
  }
  return removed;
}
