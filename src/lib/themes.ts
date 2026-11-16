export type ThemeDefinition = {
  key: string;
  name: string;
  bg: string;
  panel: string;
  ink: string;
  line: string;
  accent: string;
  radius: number;
  font: string;
  button: "solid" | "outline" | "soft";
};

export const THEMES: ThemeDefinition[] = [
  {
    key: "amber-light",
    name: "Amber light",
    bg: "#ffffff",
    panel: "#ffffff",
    ink: "#0f1b2d",
    line: "#e1e6ee",
    accent: "#f5a000",
    radius: 14,
    font: "Manrope",
    button: "solid",
  },
  {
    key: "amber-night",
    name: "Amber night",
    bg: "#0f1b2d",
    panel: "#132238",
    ink: "#eaf0f8",
    line: "#223553",
    accent: "#ffb020",
    radius: 14,
    font: "Manrope",
    button: "solid",
  },
  {
    key: "mist",
    name: "Mist",
    bg: "#f4faf7",
    panel: "#ffffff",
    ink: "#12372f",
    line: "#c9dbd3",
    accent: "#1f8a6b",
    radius: 18,
    font: "Young Serif",
    button: "soft",
  },
  {
    key: "cobalt",
    name: "Cobalt",
    bg: "#ffffff",
    panel: "#f2f4ff",
    ink: "#0e1433",
    line: "#0e1433",
    accent: "#2b4bff",
    radius: 10,
    font: "Sora",
    button: "solid",
  },
  {
    key: "rosewater",
    name: "Rosewater",
    bg: "#fff7f9",
    panel: "#ffffff",
    ink: "#3a1424",
    line: "#f0d3dc",
    accent: "#e0457b",
    radius: 22,
    font: "Figtree",
    button: "solid",
  },
  {
    key: "forest-night",
    name: "Forest night",
    bg: "#0f1f1a",
    panel: "#132820",
    ink: "#e4f3ec",
    line: "#1f3a31",
    accent: "#3ccf95",
    radius: 12,
    font: "Figtree",
    button: "outline",
  },
  {
    key: "slate-mono",
    name: "Slate mono",
    bg: "#f6f7f8",
    panel: "#ffffff",
    ink: "#16181d",
    line: "#d9dce1",
    accent: "#16181d",
    radius: 4,
    font: "Sora",
    button: "solid",
  },
  {
    key: "violet-dusk",
    name: "Violet dusk",
    bg: "#1a1530",
    panel: "#221c3d",
    ink: "#eee9ff",
    line: "#2e2650",
    accent: "#9b7bff",
    radius: 16,
    font: "Manrope",
    button: "soft",
  },
];

export const LOADER_STYLES = [
  { key: "PULSE", label: "Slot pulse" },
  { key: "SPIN", label: "Clock spin" },
  { key: "DRAW", label: "S draw" },
  { key: "CALENDAR", label: "Calendar blink" },
] as const;

export function getTheme(key: string) {
  return THEMES.find((t) => t.key === key) ?? THEMES[0];
}
