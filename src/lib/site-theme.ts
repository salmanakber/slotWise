import { getTheme } from "@/lib/themes";

export type SiteThemeTokens = {
  themeKey: string;
  accent: string;
  inkColor: string;
  bg: string;
  panel: string;
  line: string;
  font: string;
  radius: number;
};

export function resolveSiteTheme(input: {
  themeKey?: string | null;
  accent?: string | null;
  inkColor?: string | null;
  font?: string | null;
  radius?: number | null;
}): SiteThemeTokens {
  const theme = getTheme(input.themeKey ?? "amber-light");
  return {
    themeKey: input.themeKey || theme.key,
    accent: input.accent || theme.accent,
    inkColor: input.inkColor || theme.ink,
    bg: theme.bg,
    panel: theme.panel,
    line: theme.line,
    font: input.font || theme.font,
    radius: typeof input.radius === "number" ? input.radius : theme.radius,
  };
}

function contrastOn(accent: string) {
  const hex = accent.replace("#", "");
  if (hex.length < 6) return "#1a1203";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#1a1203" : "#ffffff";
}

/** Apply site branding tokens to the whole workspace (dashboard chrome). */
export function applySiteThemeToDocument(tokens: SiteThemeTokens) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const on = contrastOn(tokens.accent);
  root.style.setProperty("--bg", tokens.bg);
  root.style.setProperty("--pn", tokens.panel);
  root.style.setProperty("--ink", tokens.inkColor);
  root.style.setProperty("--ln", tokens.line);
  root.style.setProperty("--ac", tokens.accent);
  root.style.setProperty("--on", on);
  root.style.setProperty("--at", tokens.accent);
  root.style.setProperty(
    "--sf",
    `color-mix(in srgb, ${tokens.accent} 16%, ${tokens.panel})`,
  );
  root.style.setProperty(
    "--mut",
    `color-mix(in srgb, ${tokens.inkColor} 52%, #8a95a8)`,
  );
  root.style.setProperty("--sh", `0 1px 2px color-mix(in srgb, ${tokens.inkColor} 8%, transparent), 0 10px 28px color-mix(in srgb, ${tokens.inkColor} 8%, transparent)`);
  if (tokens.font && tokens.font !== "Match my site") {
    root.style.setProperty(
      "font-family",
      `${tokens.font}, var(--font-figtree), Figtree, system-ui, sans-serif`,
    );
  }
  root.dataset.siteTheme = tokens.themeKey;
}

export function siteThemeSignature(tokens: Pick<SiteThemeTokens, "themeKey" | "accent" | "inkColor" | "font" | "radius">) {
  return [tokens.themeKey, tokens.accent, tokens.inkColor, tokens.font, tokens.radius].join("|");
}

export const SITE_THEME_EVENT = "slotwise:branding";
export const SITE_THEME_CHANNEL = "slotwise-branding";

export type SiteThemeBroadcast = {
  tokens?: SiteThemeTokens | null;
  /** Local unsaved preview — shell must not overwrite from API until commit/leave. */
  preview?: boolean;
  committed?: boolean;
};

export function broadcastSiteTheme(
  tokens?: SiteThemeTokens | null,
  opts?: { preview?: boolean; committed?: boolean },
) {
  if (typeof window === "undefined") return;
  const detail: SiteThemeBroadcast = {
    tokens: tokens ?? null,
    preview: opts?.preview === true,
    committed: opts?.committed === true,
  };
  window.dispatchEvent(new CustomEvent(SITE_THEME_EVENT, { detail }));
  try {
    const bc = new BroadcastChannel(SITE_THEME_CHANNEL);
    bc.postMessage(detail);
    bc.close();
  } catch {
    // BroadcastChannel may be unavailable
  }
  if (opts?.committed || !opts?.preview) {
    try {
      window.localStorage.setItem("sw-site-theme-bump", String(Date.now()));
    } catch {
      // ignore
    }
  }
}

export function cssVarsFromTokens(tokens: SiteThemeTokens) {
  const on = contrastOn(tokens.accent);
  return `:root{--bg:${tokens.bg};--pn:${tokens.panel};--ink:${tokens.inkColor};--ln:${tokens.line};--ac:${tokens.accent};--on:${on};--at:${tokens.accent};--sf:color-mix(in srgb, ${tokens.accent} 16%, ${tokens.panel});--mut:color-mix(in srgb, ${tokens.inkColor} 52%, #8a95a8);}`;
}
