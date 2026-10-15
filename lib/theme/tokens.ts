// Oficio design tokens — "Punto" system (dark, minimal, dot-matrix).
//
// Replaces the old 8-palette "Pegatina" system with exactly 2 palettes (dark
// default, light) + 1 user-chosen "señal" (signal) accent color, independent
// of light/dark mode. See design-reference/punto/README.md and
// design-reference/punto/html/PuntoPanel.dc.html for the source values.
//
// "Sistema" (follow OS) is not a 3rd palette — it resolves to "dark" or
// "light" at render time via `prefers-color-scheme` (see resolveMode below)
// and ThemeProvider/ThemeScript, the same way `next-themes`-style libraries
// do it. There is no light-mode screenshot in the design reference (only
// dark screens exist in png/); the light palette's exact hex values below
// are my own invention, chosen to mirror the dark palette's structure and
// relative-contrast relationships (same radii, same flat/hairline-border/
// no-shadow approach, inverted luminance). See the comment on LIGHT below.

export type AccentOption = readonly [name: string, hex: string];

export type ThemeMode = "dark" | "light";
/** What's actually stored (Profile.themeId / ThemeProvider state): a mode, or "system" (follow OS). */
export type ThemeId = ThemeMode | "system";

export interface ThemeDef {
  id: ThemeMode;
  name: string;
  mode: ThemeMode;
  /** Page background ("paper"). */
  paper: string;
  /** Card/surface background. */
  card: string;
  /** Primary text + icon color (on paper/card). */
  ink: string;
  /** Secondary/muted text. */
  muted: string;
  /** Hairline border — card edges, row dividers. Very low contrast on purpose. */
  line: string;
  /** Interactive element border at rest — buttons, chips, switch track, box outlines. */
  border: string;
  /** Interactive element border on hover. */
  borderHover: string;
  /** Hard drop-shadow color. The Punto look is flat (no shadows anywhere), so
   * this is unused by any new primitive — kept only so nothing referencing
   * the legacy `var(--shadow)` (e.g. untouched `.bx`-adjacent inline styles)
   * hard-crashes before its callsite is updated in a later phase. */
  shadow: string;
  danger: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "dark",
    name: "Oscuro",
    mode: "dark",
    paper: "#0A0A0B",
    card: "#17171A",
    ink: "#F4F4F1",
    muted: "#8A8A90",
    line: "#232326",
    border: "#3A3A3F",
    borderHover: "#55555B",
    shadow: "transparent",
    danger: "#FF6A47",
  },
  {
    // LIGHT — invented (no reference screenshot exists for it). Chosen to
    // mirror the dark palette's structure 1:1, inverted:
    //   paper: near-white (not pure #FFF, so `card` can sit one step above it)
    //   card: pure white — the brightest surface, same role `card` plays as
    //     the brightest surface in dark mode (#17171A is brighter than
    //     #0A0A0B's paper)
    //   ink: near-black (mirrors dark's near-white ink)
    //   muted: a mid-gray tuned for ~4.6:1 contrast on white (AA for normal
    //     text), mirroring how dark's muted (#8A8A90) reads as secondary but
    //     still legible against #0A0A0B/#17171A
    //   line/border/borderHover: light grays, each one step darker than the
    //     last, mirroring the dark palette's line < border < borderHover
    //     progression in *reverse* lightness direction
    //   danger: a deeper, more saturated red-orange than the dark palette's
    //     pastel #FF6A47 — that hex is far too light to meet contrast on a
    //     white background, so the light palette uses a punchier value with
    //     the same hue
    id: "light",
    name: "Claro",
    mode: "light",
    paper: "#FAFAF9",
    card: "#FFFFFF",
    ink: "#0A0A0B",
    muted: "#6B6B70",
    line: "#E4E4E7",
    border: "#D4D4D8",
    borderHover: "#B0B0B6",
    shadow: "transparent",
    danger: "#D6431E",
  },
];

export const DEFAULT_THEME_ID: ThemeId = "dark";

/** Structural constants that stay the same across both palettes (flat "dot matrix" look). */
export const PUNTO = {
  radiusCard: "22px",
  radiusButton: "999px",
  radiusChip: "999px",
  buttonHeight: "52px",
} as const;

/** The 5 "señal" (signal) swatches offered on the Ajustes "Color de señal"
 * picker, exactly as PuntoAjustes.dc.html's `sw` array / the design brief.
 * Unlike the old per-theme accent trio, this is the ONE accent color, shared
 * across both light and dark, applied as `--signal`. */
export const ACCENT_SWATCHES: AccentOption[] = [
  ["Rojo", "#FF4A1C"],
  ["Ámbar", "#FFB020"],
  ["Verde", "#3DDC84"],
  ["Azul", "#4C8DFF"],
  ["Rosa", "#FF5FA2"],
];

export const DEFAULT_ACCENT_IDX = 0;

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Resolves a user's accentIdx (nullable, legacy-tolerant) to a valid index. */
export function normalizeAccentIdx(accentIdx: number | null | undefined): number {
  return accentIdx != null && accentIdx >= 0 && accentIdx < ACCENT_SWATCHES.length ? accentIdx : DEFAULT_ACCENT_IDX;
}

/** Resolves the single signal/accent hex color from a (possibly null) accentIdx. */
export function resolveSignal(accentIdx: number | null | undefined): string {
  return ACCENT_SWATCHES[normalizeAccentIdx(accentIdx)][1];
}

/**
 * Backward-compat shim for not-yet-updated call sites that still expect the
 * old `{ a1, a2, a3 }` shape (three accent colors). In the new system there
 * is only one signal color, so all three collapse onto it — see the
 * `--a1/--a2/--a3` CSS remap comment in app/globals.css for the full
 * rationale (same idea, just the TS-side equivalent).
 */
export function resolveAccents(accentIdx: number | null | undefined): { a1: string; a2: string; a3: string } {
  const signal = resolveSignal(accentIdx);
  return { a1: signal, a2: signal, a3: signal };
}

/** Is "id" a real palette (not "system")? */
export function isThemeMode(id: string): id is ThemeMode {
  return id === "dark" || id === "light";
}

/** Reads the OS color-scheme preference. Defaults to dark (this app's
 * default palette) when matchMedia isn't available (SSR, old browsers). */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolves a stored ThemeId ("dark" | "light" | "system") to a real, renderable ThemeMode. */
export function resolveMode(themeId: string): ThemeMode {
  if (isThemeMode(themeId)) return themeId;
  return systemPrefersDark() ? "dark" : "light";
}
