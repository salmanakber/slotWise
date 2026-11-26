/**
 * Absolute API origin for in-page embeds on third-party hosts (Webflow).
 * Empty string keeps same-origin relative paths on slotwise.hindaralabs.com.
 */
export function resolvePublicApiBase(explicit?: string | null): string {
  if (explicit != null && explicit !== "") {
    return explicit.replace(/\/$/, "");
  }
  if (typeof window === "undefined") return "";
  try {
    const host = window.location.hostname || "";
    if (
      host === "slotwise.hindaralabs.com" ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return "";
    }
  } catch {
    /* ignore */
  }
  return "https://slotwise.hindaralabs.com";
}

export function publicApiUrl(path: string, apiBase?: string | null): string {
  const base = resolvePublicApiBase(apiBase);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
