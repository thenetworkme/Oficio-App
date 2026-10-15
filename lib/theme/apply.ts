import { getTheme, resolveMode, resolveSignal } from "./tokens";

export const THEME_STORAGE_KEY = "oficio-theme-cache";

export interface ThemeCache {
  /** "dark" | "light" | "system" */
  themeId: string;
  accentIdx: number | null;
}

/** Applies the resolved palette (`data-theme`, `color-scheme`) and the
 * user's signal color (`--signal`) to <html>. `themeId` may be "system" —
 * it's resolved to "dark"/"light" here via prefers-color-scheme. */
export function applyTheme(themeId: string, accentIdx: number | null) {
  if (typeof document === "undefined") return;
  const mode = resolveMode(themeId);
  const theme = getTheme(mode);
  const signal = resolveSignal(accentIdx);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.id);
  root.style.setProperty("--signal", signal);
  root.style.colorScheme = theme.mode;
}

export function readThemeCache(): ThemeCache | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ThemeCache;
  } catch {
    return null;
  }
}

export function writeThemeCache(cache: ThemeCache) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore (private mode / blocked storage)
  }
}
