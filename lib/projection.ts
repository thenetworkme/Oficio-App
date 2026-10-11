import type { PracticeSession } from "@/lib/types";

export type ProjectionUnit = "weeks" | "months" | "years";

export interface Projection {
  unit: ProjectionUnit;
  value: number;
  weeksRemaining: number;
  hoursPerWeek: number;
  /** True when the goal is already met (hoursRemaining <= 0). */
  reached: boolean;
}

/** hours/week = minutes/day * days/week / 60 */
export function hoursPerWeek(minutesPerDay: number, daysPerWeek: number): number {
  return (minutesPerDay * daysPerWeek) / 60;
}

/**
 * Projects how long it will take to close `hoursRemaining` at the given
 * weekly pace, following the brief's thresholds:
 * - weeks < 9 -> show weeks
 * - weeks / 4.345 < 24 -> show months
 * - otherwise -> show years (1 decimal under 10 years, whole years from 10+)
 */
export function projectTimeRemaining(hoursRemaining: number, weeklyHours: number): Projection {
  if (hoursRemaining <= 0) {
    return { unit: "weeks", value: 0, weeksRemaining: 0, hoursPerWeek: weeklyHours, reached: true };
  }
  if (weeklyHours <= 0) {
    return { unit: "years", value: Infinity, weeksRemaining: Infinity, hoursPerWeek: weeklyHours, reached: false };
  }
  const weeks = hoursRemaining / weeklyHours;
  if (weeks < 9) {
    return { unit: "weeks", value: Math.max(1, Math.ceil(weeks)), weeksRemaining: weeks, hoursPerWeek: weeklyHours, reached: false };
  }
  const months = weeks / 4.345;
  if (months < 24) {
    return { unit: "months", value: Math.round(months), weeksRemaining: weeks, hoursPerWeek: weeklyHours, reached: false };
  }
  const years = weeks / 52.18;
  const value = years >= 10 ? Math.round(years) : Math.round(years * 10) / 10;
  return { unit: "years", value, weeksRemaining: weeks, hoursPerWeek: weeklyHours, reached: false };
}

export function formatProjection(p: Projection): string {
  if (p.reached) return "Meta alcanzada";
  if (!Number.isFinite(p.value)) return "—";
  const unitLabel = p.unit === "weeks" ? "semanas" : p.unit === "months" ? "meses" : "años";
  const valueText = p.unit === "years" ? String(p.value).replace(".", ",") : String(p.value);
  return `≈ ${valueText} ${unitLabel}`;
}

// ---------------------------------------------------------------------------
// "At this pace you'll reach 10,000 hours in X" dashboard projection.
//
// Uses the skill's *actual* logged pace (average hours/week over a trailing
// window), not its configured daily-goal pace — unlike the "ritmo actual"
// card on Estadísticas (which intentionally projects the configured goal).
// ---------------------------------------------------------------------------

export const MASTERY_HOURS = 10000;

/** Weeks per calendar month/year, consistent with projectTimeRemaining above. */
const WEEKS_PER_MONTH = 4.345;
const WEEKS_PER_YEAR = 52.18;

/**
 * Below this weekly pace, a projection would be either a division blowing up
 * (0) or so many decades out it's meaningless/alarming ("en 340 años"). Docs
 * show this as "add more sessions" instead. 0.05 h/week (3 min/week) is
 * deliberately generous: a skill practiced *at all* recently still gets a
 * real projection.
 */
const MIN_WEEKLY_HOURS_FOR_PROJECTION = 0.05;

export type TenKProjectionStatus = "reached" | "no_pace" | "projected";

export interface TenKProjection {
  status: TenKProjectionStatus;
  /** Ready-to-render Spanish sentence for every status. */
  message: string;
  weeklyHours: number;
}

/**
 * Average hours/week logged for `skillId` over the trailing `windowDays`
 * (default 90). 90 days is chosen to smooth out week-to-week noise (a single
 * busy or quiet week shouldn't swing a multi-year projection) while still
 * reflecting genuinely recent pace rather than a lifetime average that could
 * hide someone having stopped months ago. It also matches the 90-day
 * session window `useAppData` already fetches, so this needs no extra
 * Firestore query.
 */
export function recentWeeklyPace(
  sessions: Pick<PracticeSession, "skillId" | "startedAt" | "durationMin">[],
  skillId: string,
  windowDays = 90,
): number {
  const sinceMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const minutes = sessions
    .filter((s) => s.skillId === skillId && s.startedAt >= sinceMs)
    .reduce((acc, s) => acc + s.durationMin, 0);
  const weeksInWindow = windowDays / 7;
  return minutes / 60 / weeksInWindow;
}

/** "4 años y 3 meses" / "8 meses" / "2 semanas" — picks the coarsest unit(s)
 * that still read as a natural, specific duration (never "0.3 años"). */
function formatEtaPhrase(weeks: number): string {
  if (weeks < 9) {
    const n = Math.max(1, Math.round(weeks));
    return n === 1 ? "en 1 semana" : `en ${n} semanas`;
  }
  const totalMonths = weeks / WEEKS_PER_MONTH;
  if (totalMonths < 24) {
    const n = Math.max(1, Math.round(totalMonths));
    return n === 1 ? "en 1 mes" : `en ${n} meses`;
  }
  const years = Math.floor(weeks / WEEKS_PER_YEAR);
  const remainderWeeks = weeks - years * WEEKS_PER_YEAR;
  let y = years;
  let m = Math.round(remainderWeeks / WEEKS_PER_MONTH);
  if (m >= 12) {
    y += 1;
    m -= 12;
  }
  const yearPart = y === 1 ? "1 año" : `${y} años`;
  if (m === 0) return `en ${yearPart}`;
  const monthPart = m === 1 ? "1 mes" : `${m} meses`;
  return `en ${yearPart} y ${monthPart}`;
}

/**
 * Projects when a skill will reach the 10,000-hour mark at `weeklyHours`,
 * handling the two edge cases explicitly instead of letting them fall
 * through as Infinity/NaN:
 * - already past 10,000h -> a congratulatory message, no projection math.
 * - zero/near-zero recent pace -> an actionable message, never "Infinity
 *   años" or a division by zero.
 */
export function projectTenThousandHours(totalHours: number, weeklyHours: number): TenKProjection {
  const remaining = MASTERY_HOURS - totalHours;
  if (remaining <= 0) {
    return {
      status: "reached",
      message: "¡Has alcanzado las 10,000 horas! Dominio logrado.",
      weeklyHours,
    };
  }
  if (!Number.isFinite(weeklyHours) || weeklyHours < MIN_WEEKLY_HOURS_FOR_PROJECTION) {
    return {
      status: "no_pace",
      message: "Agrega más sesiones para ver una proyección.",
      weeklyHours,
    };
  }
  const weeks = remaining / weeklyHours;
  return {
    status: "projected",
    message: `A este ritmo, llegarás a las 10,000 horas ${formatEtaPhrase(weeks)}.`,
    weeklyHours,
  };
}
