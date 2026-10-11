// Oficio design tokens — "Pegatina" system (ported from
// design-reference/pegatina/docs/pegatina-tokens.json + the exact per-theme
// hex values found in design-reference/pegatina/html/PegatinaAjustes.dc.html's
// script, which is the authoritative source — the tokens.json only lists the
// theme *names*).
//
// Structural look (3px ink borders, 14px radius, hard offset shadow, -2..2deg
// sticker rotation) stays constant across every theme; only colors change.
// See PEGATINA constants below for the structural values, and THEMES for the
// per-theme color values.

export type AccentOption = readonly [name: string, hex: string];

export interface ThemeDef {
  id: string;
  name: string;
  mode: "dark" | "light";
  group: "catppuccin" | "otros";
  /** Page background ("paper"). */
  paper: string;
  /** Card/surface background. */
  card: string;
  /** Ink: text + border color. */
  ink: string;
  /** Secondary/muted text, derived close to ink but dimmer. */
  muted: string;
  /** Hard drop-shadow color. */
  shadow: string;
  /** Default accent chip colors (a1/a2/a3). a1 can be overridden per-user. */
  a1: string;
  a2: string;
  a3: string;
  danger: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "pegatina",
    name: "Pegatina",
    mode: "light",
    group: "otros",
    paper: "#FFF4D6",
    card: "#FFFFFF",
    ink: "#111111",
    muted: "#5b5b5b",
    shadow: "#111111",
    a1: "#FFD84D",
    a2: "#FF8FB8",
    a3: "#7BE0A4",
    danger: "#D6361F",
  },
  {
    id: "mocha",
    name: "Catppuccin Mocha",
    mode: "dark",
    group: "catppuccin",
    paper: "#1E1E2E",
    card: "#313244",
    ink: "#CDD6F4",
    muted: "#A6ADC8",
    shadow: "#11111B",
    a1: "#F9E2AF",
    a2: "#F5C2E7",
    a3: "#A6E3A1",
    danger: "#F38BA8",
  },
  {
    id: "macchiato",
    name: "Catppuccin Macchiato",
    mode: "dark",
    group: "catppuccin",
    paper: "#24273A",
    card: "#363A4F",
    ink: "#CAD3F5",
    muted: "#A5ADCB",
    shadow: "#181926",
    a1: "#EED49F",
    a2: "#F5BDE6",
    a3: "#A6DA95",
    danger: "#ED8796",
  },
  {
    id: "frappe",
    name: "Catppuccin Frappé",
    mode: "dark",
    group: "catppuccin",
    paper: "#303446",
    card: "#414559",
    ink: "#C6D0F5",
    muted: "#A5ADCE",
    shadow: "#232634",
    a1: "#E5C890",
    a2: "#F4B8E4",
    a3: "#A6D189",
    danger: "#E78284",
  },
  {
    id: "latte",
    name: "Catppuccin Latte",
    mode: "light",
    group: "catppuccin",
    paper: "#EFF1F5",
    card: "#FFFFFF",
    ink: "#4C4F69",
    muted: "#5C5F77",
    shadow: "#4C4F69",
    a1: "#F2C46D",
    a2: "#EA76CB",
    a3: "#8BD17C",
    danger: "#D20F39",
  },
  {
    id: "nord",
    name: "Nord",
    mode: "dark",
    group: "otros",
    paper: "#2E3440",
    card: "#3B4252",
    ink: "#ECEFF4",
    muted: "#B4BDCD",
    shadow: "#1B1F27",
    a1: "#EBCB8B",
    a2: "#B48EAD",
    a3: "#A3BE8C",
    danger: "#BF616A",
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    mode: "dark",
    group: "otros",
    paper: "#282828",
    card: "#3C3836",
    ink: "#EBDBB2",
    muted: "#A89984",
    shadow: "#1D2021",
    a1: "#FABD2F",
    a2: "#D3869B",
    a3: "#B8BB26",
    danger: "#FB4934",
  },
  {
    id: "rosepine",
    name: "Rosé Pine",
    mode: "dark",
    group: "otros",
    paper: "#191724",
    card: "#26233A",
    ink: "#E0DEF4",
    muted: "#908CAA",
    shadow: "#0F0D1A",
    a1: "#F6C177",
    a2: "#EB6F92",
    a3: "#9CCFD8",
    danger: "#EB6F92",
  },
];

export const DEFAULT_THEME_ID = "pegatina";

/** Structural constants that stay the same across every theme (neo-brutalist "sticker" look). */
export const PEGATINA = {
  borderWidth: "3px",
  radius: "14px",
  radiusPill: "999px",
  shadowRest: "6px",
  shadowHover: "9px",
  shadowActive: "2px",
} as const;

/** The 5 accent swatches offered on the Ajustes "Color principal" picker — a
 * fixed, cross-theme palette (unlike the old per-theme accent lists), exactly
 * as PegatinaAjustes.dc.html's `sw` array. Overrides only --a1. */
export const ACCENT_SWATCHES: AccentOption[] = [
  ["Ámbar", "#FFD84D"],
  ["Rosa", "#FF8FB8"],
  ["Verde", "#7BE0A4"],
  ["Cielo", "#7CC4FF"],
  ["Naranja", "#FF9F5A"],
];

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Resolves the accent (--a1), honoring a user override (index into
 * ACCENT_SWATCHES, or null for the theme's own a1); a2/a3 always come from
 * the theme. */
export function resolveAccents(theme: ThemeDef, accentIdx: number | null) {
  const override =
    accentIdx != null && accentIdx >= 0 && accentIdx < ACCENT_SWATCHES.length ? ACCENT_SWATCHES[accentIdx][1] : null;
  return {
    a1: override ?? theme.a1,
    a2: theme.a2,
    a3: theme.a3,
  };
}

/** "Follow system theme" = Latte by day, Mocha by night (per the brief). */
export function systemThemeId(hour: number): string {
  return hour >= 7 && hour < 19 ? "latte" : "mocha";
}
