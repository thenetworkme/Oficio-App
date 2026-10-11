import { getTheme, resolveAccents } from "./tokens";

export const THEME_STORAGE_KEY = "oficio-theme-cache";

export interface ThemeCache {
  themeId: string;
  accentIdx: number;
  followSystem: boolean;
}

export function applyTheme(themeId: string, accentIdx: number) {
  if (typeof document === "undefined") return;
  const theme = getTheme(themeId);
  const { accent, a2, a3 } = resolveAccents(theme, accentIdx);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.id);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--a2", a2);
  root.style.setProperty("--a3", a3);
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
