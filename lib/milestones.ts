export const MILESTONES = [1, 10, 100, 500, 1000, 5000, 10000] as const;
export type Milestone = (typeof MILESTONES)[number];

/** A milestone is reached once total hours meets or exceeds it. */
export function isMilestoneReached(totalHours: number, milestone: number): boolean {
  return totalHours >= milestone;
}

export function nextMilestone(totalHours: number): Milestone | null {
  for (const m of MILESTONES) {
    if (totalHours < m) return m;
  }
  return null;
}

export function reachedMilestones(totalHours: number): Milestone[] {
  return MILESTONES.filter((m) => totalHours >= m);
}

/**
 * Returns every milestone crossed by going from `beforeHours` to `afterHours`
 * (before < milestone <= after), in ascending order. Used right after saving
 * a session (timer or manual) to decide whether to show the celebration.
 */
export function milestonesCrossed(beforeHours: number, afterHours: number): Milestone[] {
  if (afterHours <= beforeHours) return [];
  return MILESTONES.filter((m) => beforeHours < m && m <= afterHours);
}
