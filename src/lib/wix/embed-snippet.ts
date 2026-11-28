/**
 * Wix-facing embed helpers. Does not touch Webflow Custom Code registration.
 * Same hosted runtime as Webflow customer sites: public/embed/widget.js
 */

export const SLOTWISE_WIDGET_URL = "https://slotwise.hindaralabs.com/embed/widget.js";

export function wixMountHtml(publicKey: string) {
  const key = publicKey.trim();
  return `<div data-slotwise-widget="${key}" data-site="${key}" style="width:100%;max-width:100%;min-height:120px;"></div>`;
}

export function wixScriptHtml(opts?: { integrity?: string | null }) {
  const integrity = opts?.integrity?.trim();
  if (integrity) {
    return `<script src="${SLOTWISE_WIDGET_URL}" integrity="${integrity}" crossorigin="anonymous"></script>`;
  }
  return `<script src="${SLOTWISE_WIDGET_URL}" crossorigin="anonymous"></script>`;
}

/** Full HTML snippet for a Wix Embed / Custom Code element. */
export function wixEmbedSnippet(publicKey: string, opts?: { integrity?: string | null }) {
  return `${wixMountHtml(publicKey)}\n${wixScriptHtml(opts)}`;
}
