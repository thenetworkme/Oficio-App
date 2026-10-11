/**
 * Pure logic for a single challenge's day-by-day state, streak and
 * projections. Mirrors the style of lib/streak.ts, but a challenge's streak
 * is scoped to its own 1..totalDays sequence (not the app-wide daily-minutes
 * streak), so it lives in its own module rather than calling into that one.
 *
 * Day numbering: day 1 is the challenge's startedAt date. `currentDayNumber`
 * is how many days have elapsed since startedAt (1 on the start date itself,
 * 2 the day after, etc.) — the caller computes this from the user's
 * timezone (see lib/tz.ts's dateKeyInTz) and passes it in, keeping this
 * module free of Date/Intl/timezone concerns.
 */

export type ChallengeDayState = "done" | "grace" | "today" | "missed" | "upcoming";

export interface ChallengeDayRecord {
  dayNumber: number;
  durationMin: number;
}

export interface DayStatesResult {
  /** states[i] is the state of day i+1. */
  states: ChallengeDayState[];
  graceDaysUsed: number;
}

/**
 * Walks days 1..totalDays and classifies each one. A past day with no
 * logged minutes consumes one of the challenge's grace days (in
 * chronological order) until the budget runs out, after which past days
 * with no minutes are "missed". The current day is "today" until it has
 * minutes logged, then "done"; days beyond currentDayNumber are "upcoming".
 */
export function computeDayStates(
  totalDays: number,
  currentDayNumber: number,
  loggedDays: ChallengeDayRecord[],
  graceDaysAllowed: number,
): DayStatesResult {
  const doneSet = new Set(loggedDays.filter((d) => d.durationMin > 0).map((d) => d.dayNumber));
  const states: ChallengeDayState[] = [];
  let graceDaysUsed = 0;

  for (let day = 1; day <= totalDays; day++) {
    if (day > currentDayNumber) {
      states.push("upcoming");
      continue;
    }
    if (doneSet.has(day)) {
      states.push("done");
      continue;
    }
    if (day === currentDayNumber) {
      states.push("today");
      continue;
    }
    // Past day, not logged.
    if (graceDaysUsed < graceDaysAllowed) {
      graceDaysUsed += 1;
      states.push("grace");
    } else {
      states.push("missed");
    }
  }

  return { states, graceDaysUsed };
}

export interface ChallengeStreak {
  current: number;
  best: number;
}

/**
 * Current streak: consecutive "done"/"grace" days counting back from the
 * most recent non-"upcoming" day, stopping at the first "missed" day (or at
 * "today", which doesn't count until it's done). Best streak: the longest
 * such run found anywhere in the sequence.
 */
export function computeChallengeStreak(states: ChallengeDayState[]): ChallengeStreak {
  let best = 0;
  let run = 0;
  for (const s of states) {
    if (s === "done" || s === "grace") {
      run += 1;
      best = Math.max(best, run);
    } else if (s === "missed") {
      run = 0;
    }
    // "today"/"upcoming" neither extend nor reset the running count.
  }

  let current = 0;
  for (let i = states.length - 1; i >= 0; i--) {
    const s = states[i];
    if (s === "upcoming" || s === "today") continue;
    if (s === "done" || s === "grace") current += 1;
    else break; // "missed"
  }

  return { current, best };
}

/** Minutes actually invested across every logged day. */
export function totalInvestedMin(loggedDays: ChallengeDayRecord[]): number {
  return loggedDays.reduce((acc, d) => acc + Math.max(0, d.durationMin), 0);
}

/** Day number (1-based) for `dateKey` given the challenge's start date key, both "yyyy-MM-dd". */
export function dayNumberForDate(startDateKey: string, dateKey: string): number {
  const toUtcDays = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return toUtcDays(dateKey) - toUtcDays(startDateKey) + 1;
}

/** "yyyy-MM-dd" for day N of a challenge that started on `startDateKey`. */
export function dateForDayNumber(startDateKey: string, dayNumber: number): string {
  const [y, m, d] = startDateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + (dayNumber - 1));
  return dt.toISOString().slice(0, 10);
}

/** Projected end date "yyyy-MM-dd" for a challenge of `totalDays` starting on `startDateKey`. */
export function projectedEndDate(startDateKey: string, totalDays: number): string {
  return dateForDayNumber(startDateKey, totalDays);
}

const TEN_THOUSAND_HOURS = 10_000;

/** % of the linked skill's classic 10,000h mastery goal this challenge alone contributes. */
export function percentOfTenThousandHours(totalDays: number, dailyGoalMin: number): number {
  const totalHours = (totalDays * dailyGoalMin) / 60;
  return (totalHours / TEN_THOUSAND_HOURS) * 100;
}
