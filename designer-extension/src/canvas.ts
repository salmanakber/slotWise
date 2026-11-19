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

  // Fallback: if we know mode explicitly
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
  /** From workspace branding — HORIZONTAL (Wide board) forces 70% iframe width. */
  calendarStyle?: string | null;
};

/**
 * Direct canvas embed: insert an iframe pointing at the live booking widget.
 * Requires Webflow **Design** mode (not Build / Preview / Comment).
 */
export async function insertBookingIframe(
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

  const src = `${APP_URL}/book/${encodeURIComponent(publicKey)}?embed=1`;
  const calendarStyle = options?.calendarStyle || null;
  const canvasWide =
    typeof localStorage !== "undefined" && localStorage.getItem("slotwise-canvas-wide") === "1";
  // Wide board → always 70%. Day/Week strip → compact. Unknown → Designer toggle.
  const useWide =
    calendarStyle === "HORIZONTAL"
      ? true
      : calendarStyle === "MONTH" || calendarStyle === "WEEK"
        ? false
        : canvasWide;

  const wrapStyle =
    "width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow:hidden;display:block;";
  // Start short; widget.js / postMessage grows height. Avoids a tall empty box after uninstall.
  const frameStyle = useWide
    ? "display:block;width:70%;max-width:70%;margin-left:auto;margin-right:auto;height:720px;min-height:0;border:0;border-radius:16px;overflow:hidden;box-sizing:border-box;"
    : "display:block;width:100%;max-width:29.2rem;margin-left:auto;margin-right:auto;height:640px;min-height:0;border:0;border-radius:16px;overflow:hidden;box-sizing:border-box;";

  try {
    if (typeof api.elementBuilder === "function") {
      const root = api.elementBuilder(api.elementPresets.DOM);
      root.setTag("div");
      root.setAttribute("data-slotwise-widget", publicKey);
      root.setAttribute("data-site", publicKey);
      if (calendarStyle) root.setAttribute("data-calendar-style", calendarStyle);
      root.setAttribute("style", wrapStyle);
      const frame = root.append(api.elementPresets.DOM);
      frame.setTag("iframe");
      frame.setAttribute("src", src);
      frame.setAttribute("title", "Slotwise booking");
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("scrolling", "no");
      frame.setAttribute("style", frameStyle);
      if (calendarStyle) frame.setAttribute("data-calendar-style", calendarStyle);
      await parent.append(root);
    } else {
      const wrap = await parent.append(api.elementPresets.DOM);
      await wrap.setTag("div");
      await wrap.setAttribute("data-slotwise-widget", publicKey);
      await wrap.setAttribute("data-site", publicKey);
      if (calendarStyle) await wrap.setAttribute("data-calendar-style", calendarStyle);
      await wrap.setAttribute("style", wrapStyle);
      const iframe = await wrap.append(api.elementPresets.DOM);
      await iframe.setTag("iframe");
      await iframe.setAttribute("src", src);
      await iframe.setAttribute("title", "Slotwise booking");
      await iframe.setAttribute("loading", "lazy");
      await iframe.setAttribute("scrolling", "no");
      await iframe.setAttribute("style", frameStyle);
      if (calendarStyle) await iframe.setAttribute("data-calendar-style", calendarStyle);
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

  await notify(
    "Success",
    useWide
      ? "Booking widget placed (Wide board · 70% width)"
      : "Booking widget placed on the canvas",
  );
}

/**
 * Remove leftover Slotwise booking blocks from the current Designer page.
 * Call after uninstall — Webflow keeps canvas elements even when the app is removed.
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
