import { dateKeyInTz } from "@/lib/tz";
import type { DailyMinutes } from "@/lib/streak";
import type { PracticeSession } from "@/lib/types";

/**
 * Buckets a skill's sessions into per-local-calendar-day totals, for the
 * consistency heatmap. Grouping happens in the user's own timezone (via
 * dateKeyInTz, same as useAppData's overall dailyMinutes) rather than UTC,
 * so a late-night session doesn't get silently shifted onto the next day.
 */
export function buildSkillDailyMinutes(
  sessions: Pick<PracticeSession, "skillId" | "startedAt" | "durationMin">[],
  skillId: string,
  timezone: string,
): DailyMinutes {
  const map: DailyMinutes = {};
  for (const s of sessions) {
    if (s.skillId !== skillId) continue;
    const key = dateKeyInTz(new Date(s.startedAt), timezone);
    map[key] = (map[key] ?? 0) + s.durationMin;
  }
  return map;
}

/** 0-4 activity level for a day's minutes, relative to a daily "full" scale.
 * Thresholds carried over unchanged from the pre-Punto heatmap (only the
 * rendered dot colors changed, via heatmapDotColor below). */
export function heatmapLevel(minutes: number, scaleMinutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  const ratio = minutes / scaleMinutes;
  if (ratio < 0.2) return 1;
  if (ratio < 0.45) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/** Opacity (%) of `color` mixed over `base` for each level — Punto's 5-level
 * dot scale, ported from design-reference/punto's heat() method
 * (`['#1B1B1E', 'rgba(244,244,241,.22)', ..., '#F4F4F1']`, i.e. 0/22/45/72/
 * 100% of the lit color over the surface). */
const LEVEL_OPACITY_PCT = [0, 22, 45, 72, 100] as const;

/** CSS color for a heatmap dot at the given level: `base` (no data) for
 * level 0, else `color` mixed into `base` at the level's opacity. Works with
 * any valid CSS color, including `var(--x)` references, since color-mix
 * resolves them at paint time. */
export function heatmapDotColor(level: 0 | 1 | 2 | 3 | 4, color: string, base: string): string {
  if (level === 0) return base;
  return `color-mix(in srgb, ${color} ${LEVEL_OPACITY_PCT[level]}%, ${base})`;
}
