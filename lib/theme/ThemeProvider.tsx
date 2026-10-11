"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { updateProfile } from "@/lib/firestore/profiles";
import { applyTheme, writeThemeCache } from "@/lib/theme/apply";
import { DEFAULT_THEME_ID, getTheme, systemThemeId, THEMES } from "@/lib/theme/tokens";

interface ThemeContextValue {
  themeId: string;
  accentIdx: number | null;
  followSystem: boolean;
  setTheme: (themeId: string, accentIdx?: number | null) => void;
  setAccentIdx: (idx: number | null) => void;
  setFollowSystem: (follow: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [accentIdx, setAccentIdxState] = useState<number | null>(null);
  const [followSystem, setFollowSystemState] = useState(false);

  // Sync local state from the user's profile once it loads.
  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeId(profile.themeId);
    setAccentIdxState(profile.accentIdx);
    setFollowSystemState(profile.followSystemTheme);
  }, [profile]);

  // Apply + cache whenever the effective theme changes, re-checking the
  // system clock for "follow system" every few minutes so Latte/Mocha swap
  // automatically across sunrise/sunset without a reload.
  useEffect(() => {
    function effectiveTheme() {
      return followSystem ? systemThemeId(new Date().getHours()) : themeId;
    }
    function effectiveAccent() {
      return followSystem ? null : accentIdx;
    }
    function apply() {
      const effId = effectiveTheme();
      const effAccent = effectiveAccent();
      applyTheme(effId, effAccent);
      writeThemeCache({ themeId, accentIdx, followSystem });
    }
    apply();
    const interval = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [themeId, accentIdx, followSystem]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      accentIdx,
      followSystem,
      setTheme(id, idx = null) {
        setThemeId(id);
        setAccentIdxState(idx);
        if (profile) void updateProfile(profile.uid, { themeId: id, accentIdx: idx });
      },
      setAccentIdx(idx) {
        setAccentIdxState(idx);
        if (profile) void updateProfile(profile.uid, { accentIdx: idx });
      },
      setFollowSystem(follow) {
        setFollowSystemState(follow);
        if (profile) void updateProfile(profile.uid, { followSystemTheme: follow });
      },
    }),
    [themeId, accentIdx, followSystem, profile],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useOficioTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useOficioTheme must be used within ThemeProvider");
  return ctx;
}

export { THEMES, getTheme };
