/**
 * Streak math. All dates are plain "yyyy-MM-dd" strings in the user's local
 * timezone (the caller is responsible for converting session timestamps to
 * that timezone before building the per-day totals map) so this module stays
 * pure and easily testable without any Intl/timezone mocking.
 */

export type DailyMinutes = Record<string, number>;

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Consecutive days (ending today or yesterday) meeting at least
 * `minDailyMinutes`. Today is only required to count if it already met the
 * minimum; otherwise the streak is evaluated as of yesterday so it doesn't
 * appear broken before the day is over.
 */
export function computeCurrentStreak(
  dailyMinutes: DailyMinutes,
  minDailyMinutes: number,
  todayStr: string,
): number {
  let cursor = todayStr;
  if ((dailyMinutes[todayStr] ?? 0) < minDailyMinutes) {
    cursor = shiftDate(todayStr, -1);
  }
  let streak = 0;
  for (;;) {
    const mins = dailyMinutes[cursor] ?? 0;
    if (mins < minDailyMinutes) break;
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive qualifying days found anywhere in the map. */
export function computeBestStreak(dailyMinutes: DailyMinutes, minDailyMinutes: number): number {
  const days = Object.keys(dailyMinutes).sort();
  let best = 0;
  let current = 0;
  let prevDate: string | null = null;
  for (const day of days) {
    const mins = dailyMinutes[day] ?? 0;
    if (mins < minDailyMinutes) {
      current = 0;
      prevDate = day;
      continue;
    }
    if (prevDate && shiftDate(prevDate, 1) === day) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    prevDate = day;
  }
  return best;
}

/** Whether today still needs the streak-guard reminder (hasn't hit the minimum yet). */
export function needsStreakGuard(
  dailyMinutes: DailyMinutes,
  minDailyMinutes: number,
  todayStr: string,
): boolean {
  return (dailyMinutes[todayStr] ?? 0) < minDailyMinutes;
}
