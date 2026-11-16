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

/**
 * Direct canvas embed: insert an iframe pointing at the live booking widget.
 * (HtmlEmbed content cannot be set via Designer API — iframe DOM is the reliable path.)
 */
export async function insertBookingIframe(publicKey: string) {
  const api = wf();
  if (!api?.getSelectedElement || !api?.elementPresets?.DOM) {
    throw new Error("Open this from Webflow Designer to embed on canvas");
  }

  let parent = await api.getSelectedElement();
  if (!parent?.children) {
    const all = await api.getAllElements?.();
    parent = all?.find?.((e: { type?: string; children?: boolean }) => e.type === "Body" || e.children) ?? null;
  }
  if (!parent?.append) throw new Error("Select a section or container on the canvas first");

  const src = `${APP_URL}/book/${encodeURIComponent(publicKey)}?embed=1`;

  // Prefer builder when available
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
    frame.setAttribute("style", "width:100%;min-height:720px;border:0;border-radius:18px;");
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
    await iframe.setAttribute("style", "width:100%;min-height:720px;border:0;border-radius:18px;");
  }

  await notify("Success", "Booking widget placed on the canvas");
}
