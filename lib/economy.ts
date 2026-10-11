// Pure economy math for the Pegatina gamification layer (coins, XP, levels).
// Formulas are lifted verbatim from design-reference/pegatina/html/PegatinaCierre.dc.html's
// script (confirmed against docs/pegatina-tokens.json):
//   coins = round(durationMin / 25 * 10) + (quality >= 4 ? 5 : 0)
//   xp    = round(durationMin * (0.8 + quality * 0.1))
//
// `quality` is the existing sessions.quality rating (1-5). Manual log entries
// can have quality === null (no rating UI shown); for those we treat the
// focus bonus as not qualifying and use 0 for the XP formula's quality term
// — i.e. an un-rated session still earns the base coins-per-minute and a
// reduced XP amount (durationMin * 0.8), never nothing. This is a judgement
// call documented here and in the README, since the mockup's quality picker
// is always shown with a default (q=4) and never depicts an unrated state.

export function coinsPerSession(durationMin: number, quality: number | null): number {
  const base = Math.round((durationMin / 25) * 10);
  const bonus = quality != null && quality >= 4 ? 5 : 0;
  return base + bonus;
}

export function xpForSession(durationMin: number, quality: number | null): number {
  const q = quality ?? 0;
  return Math.round(durationMin * (0.8 + q * 0.1));
}

/** Welcome coins granted once, during onboarding (PegatinaOnboarding step 4). */
export const WELCOME_COINS = 100;

/**
 * Level curve. The mockup (PegatinaCierre) shows a character at "Nv. 14"
 * with a per-level XP bar reading "xpNow / 2.400 XP" — i.e. it depicts a
 * *fixed* XP band per level, not an escalating one. The mockups never show
 * an explicit formula, only that one example point, so this is an inferred
 * choice (documented in the README): a flat 2400 XP per level, which is
 * simple, monotonic, and matches the one data point we have exactly.
 */
export const XP_PER_LEVEL = 2400;

export function levelForXp(totalXp: number): number {
  return Math.max(1, Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1);
}

/** XP accumulated within the current level, and how much is needed for the next one. */
export function levelProgress(totalXp: number): { level: number; xpIntoLevel: number; xpForNext: number; pct: number } {
  const level = levelForXp(totalXp);
  const xpIntoLevel = Math.max(0, totalXp) - (level - 1) * XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpForNext: XP_PER_LEVEL,
    pct: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
  };
}
