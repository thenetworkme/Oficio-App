// Oficio design tokens — ported from design-reference/docs/design-tokens.json
// Each theme defines the non-accent palette tokens (bg/card/line/text/muted/on/track/sel)
// plus a list of named accent colors the user can choose from.

export type AccentOption = readonly [name: string, hex: string];

export interface ThemeDef {
  id: string;
  name: string;
  mode: "dark" | "light";
  group: "catppuccin" | "otros";
  bg: string;
  card: string;
  line: string;
  text: string;
  muted: string;
  on: string;
  track: string;
  sel: string;
  accents: AccentOption[];
}

export const THEMES: ThemeDef[] = [
  {
    id: "oficio",
    name: "Oficio",
    mode: "dark",
    group: "otros",
    bg: "#111311",
    card: "#181B18",
    line: "#2A2F2A",
    text: "#ECE9E0",
    muted: "#A3A89E",
    on: "#111311",
    track: "#262B26",
    sel: "#1F231F",
    accents: [
      ["Ámbar", "#F0A93B"],
      ["Agua", "#4FC1AC"],
      ["Lila", "#B5A1F0"],
      ["Coral", "#F07A5C"],
    ],
  },
  {
    id: "mocha",
    name: "Catppuccin Mocha",
    mode: "dark",
    group: "catppuccin",
    bg: "#181825",
    card: "#1e1e2e",
    line: "#313244",
    text: "#cdd6f4",
    muted: "#a6adc8",
    on: "#11111b",
    track: "#313244",
    sel: "#313244",
    accents: [
      ["Mauve", "#cba6f7"],
      ["Peach", "#fab387"],
      ["Teal", "#94e2d5"],
      ["Blue", "#89b4fa"],
      ["Green", "#a6e3a1"],
      ["Pink", "#f5c2e7"],
    ],
  },
  {
    id: "macchiato",
    name: "Catppuccin Macchiato",
    mode: "dark",
    group: "catppuccin",
    bg: "#1e2030",
    card: "#24273a",
    line: "#363a4f",
    text: "#cad3f5",
    muted: "#a5adcb",
    on: "#181926",
    track: "#363a4f",
    sel: "#363a4f",
    accents: [
      ["Mauve", "#c6a0f6"],
      ["Peach", "#f5a97f"],
      ["Teal", "#8bd5ca"],
      ["Blue", "#8aadf4"],
      ["Green", "#a6da95"],
      ["Pink", "#f5bde6"],
    ],
  },
  {
    id: "frappe",
    name: "Catppuccin Frappé",
    mode: "dark",
    group: "catppuccin",
    bg: "#292c3c",
    card: "#303446",
    line: "#414559",
    text: "#c6d0f5",
    muted: "#a5adce",
    on: "#232634",
    track: "#414559",
    sel: "#414559",
    accents: [
      ["Mauve", "#ca9ee6"],
      ["Peach", "#ef9f76"],
      ["Teal", "#81c8be"],
      ["Blue", "#8caaee"],
      ["Green", "#a6d189"],
      ["Pink", "#f4b8e4"],
    ],
  },
  {
    id: "latte",
    name: "Catppuccin Latte",
    mode: "light",
    group: "catppuccin",
    bg: "#e6e9ef",
    card: "#eff1f5",
    line: "#ccd0da",
    text: "#4c4f69",
    muted: "#5c5f77",
    on: "#eff1f5",
    track: "#ccd0da",
    sel: "#ccd0da",
    accents: [
      ["Mauve", "#8839ef"],
      ["Blue", "#1e66f5"],
      ["Teal", "#179299"],
      ["Green", "#40a02b"],
      ["Peach", "#fe640b"],
      ["Pink", "#ea76cb"],
    ],
  },
  {
    id: "nord",
    name: "Nord",
    mode: "dark",
    group: "otros",
    bg: "#2e3440",
    card: "#3b4252",
    line: "#4c566a",
    text: "#eceff4",
    muted: "#b4bdcd",
    on: "#2e3440",
    track: "#434c5e",
    sel: "#434c5e",
    accents: [
      ["Frost", "#88c0d0"],
      ["Amarillo", "#ebcb8b"],
      ["Verde", "#a3be8c"],
      ["Púrpura", "#b48ead"],
      ["Naranja", "#d08770"],
      ["Azul", "#81a1c1"],
    ],
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    mode: "dark",
    group: "otros",
    bg: "#1d2021",
    card: "#282828",
    line: "#3c3836",
    text: "#ebdbb2",
    muted: "#a89984",
    on: "#1d2021",
    track: "#3c3836",
    sel: "#3c3836",
    accents: [
      ["Amarillo", "#fabd2f"],
      ["Aqua", "#8ec07c"],
      ["Rosa", "#d3869b"],
      ["Azul", "#83a598"],
      ["Naranja", "#fe8019"],
      ["Verde", "#b8bb26"],
    ],
  },
  {
    id: "rosepine",
    name: "Rosé Pine",
    mode: "dark",
    group: "otros",
    bg: "#191724",
    card: "#1f1d2e",
    line: "#26233a",
    text: "#e0def4",
    muted: "#908caa",
    on: "#191724",
    track: "#26233a",
    sel: "#26233a",
    accents: [
      ["Rose", "#ebbcba"],
      ["Iris", "#c4a7e7"],
      ["Foam", "#9ccfd8"],
      ["Gold", "#f6c177"],
      ["Love", "#eb6f92"],
    ],
  },
];

export const DEFAULT_THEME_ID = "oficio";

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Resolves the accent (--accent) and the two companion skill colors (--a2 / --a3):
 * the theme's first two palette accents that are not the chosen one. */
export function resolveAccents(theme: ThemeDef, accentIdx: number) {
  const idx = accentIdx >= 0 && accentIdx < theme.accents.length ? accentIdx : 0;
  const accent = theme.accents[idx][1];
  const rest = theme.accents.map((a) => a[1]).filter((hex) => hex !== accent);
  return {
    accent,
    a2: rest[0] ?? accent,
    a3: rest[1] ?? rest[0] ?? accent,
  };
}

/** "Follow system theme" = Latte by day, Mocha by night (per the brief). */
export function systemThemeId(hour: number): string {
  return hour >= 7 && hour < 19 ? "latte" : "mocha";
}
