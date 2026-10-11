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
