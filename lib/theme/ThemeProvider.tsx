"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { updateProfile } from "@/lib/firestore/profiles";
import { applyTheme, writeThemeCache } from "@/lib/theme/apply";
import {
  DEFAULT_ACCENT_IDX,
  DEFAULT_THEME_ID,
  isThemeMode,
  normalizeAccentIdx,
  resolveMode,
  resolveSignal,
  type ThemeId,
  type ThemeMode,
} from "@/lib/theme/tokens";

interface ThemeContextValue {
  /** Raw stored preference: "dark" | "light" | "system". */
  themeId: ThemeId;
  /** "system" resolved to a real palette via prefers-color-scheme. */
  mode: ThemeMode;
  /** Index into ACCENT_SWATCHES (normalized; never null here). */
  accentIdx: number;
  /** The resolved hex of the current signal/accent color. */
  signal: string;
  setThemeId: (id: ThemeId) => void;
  setAccentIdx: (idx: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Profile.themeId is a plain `string` in Firestore for backward
 * compatibility (no field rename) — narrow it defensively to a real ThemeId. */
function toThemeId(raw: string | undefined): ThemeId {
  if (raw === "system" || isThemeMode(raw ?? "")) return raw as ThemeId;
  return DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [accentIdx, setAccentIdxState] = useState(DEFAULT_ACCENT_IDX);
  const [mode, setMode] = useState<ThemeMode>(resolveMode(DEFAULT_THEME_ID));

  // Sync local state from the user's profile once it loads. themeId now
  // stores "dark" | "light" | "system" directly (see lib/theme/tokens.ts);
  // profile.followSystemTheme is kept in sync as an alias (true iff
  // themeId === "system") purely so older/other clients reading that
  // boolean field still see a consistent value — it isn't itself read here.
  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeIdState(toThemeId(profile.themeId));
    setAccentIdxState(normalizeAccentIdx(profile.accentIdx));
  }, [profile]);

  // Apply + cache whenever the effective theme changes, and live-update when
  // themeId === "system" and the OS preference changes (no reload needed).
  useEffect(() => {
    function apply() {
      const resolved = resolveMode(themeId);
      setMode(resolved);
      applyTheme(themeId, accentIdx);
      writeThemeCache({ themeId, accentIdx });
    }
    apply();
    if (themeId !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [themeId, accentIdx]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      mode,
      accentIdx,
      signal: resolveSignal(accentIdx),
      setThemeId(id) {
        setThemeIdState(id);
        if (profile) void updateProfile(profile.uid, { themeId: id, followSystemTheme: id === "system" });
      },
      setAccentIdx(idx) {
        const normalized = normalizeAccentIdx(idx);
        setAccentIdxState(normalized);
        if (profile) void updateProfile(profile.uid, { accentIdx: normalized });
      },
    }),
    [themeId, mode, accentIdx, profile],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useOficioTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useOficioTheme must be used within ThemeProvider");
  return ctx;
}
