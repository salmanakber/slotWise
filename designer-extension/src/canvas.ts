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

/**
 * Direct canvas embed: insert an iframe pointing at the live booking widget.
 * Requires Webflow **Design** mode (not Build / Preview / Comment).
 */
export async function insertBookingIframe(publicKey: string) {
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

  try {
    if (typeof api.elementBuilder === "function") {
      const root = api.elementBuilder(api.elementPresets.DOM);
      root.setTag("div");
      root.setAttribute("data-slotwise-widget", publicKey);
      root.setAttribute("data-site", publicKey);
      const frame = root.append(api.elementPresets.DOM);
      frame.setTag("iframe");
      frame.setAttribute("src", src);
      frame.setAttribute("title", "Slotwise booking");
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("style", "width:100%;min-height:720px;border:0;border-radius:16px;");
      await parent.append(root);
    } else {
      const wrap = await parent.append(api.elementPresets.DOM);
      await wrap.setTag("div");
      await wrap.setAttribute("data-slotwise-widget", publicKey);
      await wrap.setAttribute("data-site", publicKey);
      const iframe = await wrap.append(api.elementPresets.DOM);
      await iframe.setTag("iframe");
      await iframe.setAttribute("src", src);
      await iframe.setAttribute("title", "Slotwise booking");
      await iframe.setAttribute("loading", "lazy");
      await iframe.setAttribute("style", "width:100%;min-height:720px;border:0;border-radius:16px;");
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

  await notify("Success", "Booking widget placed on the canvas");
}
