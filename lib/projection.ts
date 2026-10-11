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
