import type { ChallengeDayState } from "@/lib/challenge";

/** Compresses a challenge's day states down to at most `max` dots (sampling
 * proportionally), for the small progress-dots row on the Retos list card. */
export function sampleDayDots(states: ChallengeDayState[], max = 30): ChallengeDayState[] {
  const total = states.length;
  const k = Math.min(total, max);
  if (k <= 0) return [];
  return Array.from({ length: k }, (_, i) => {
    const idx = Math.min(total - 1, Math.ceil(((i + 1) / k) * total) - 1);
    return states[idx];
  });
}

/** Shared color/label mapping for a challenge day cell, used by the detail
 * board's calendar and the gallery. "Grace" and "missed" use the mockup's
 * own fixed sky-blue/pink rather than the theme's --a1/--a2/--a3 (those are
 * already spoken for by "today"/"done" and the challenge's own color), which
 * is a deliberate simplification: these two semantic colors stay constant
 * across themes instead of flipping with the active palette. */
export const DAY_STATE_COLOR: Record<ChallengeDayState, string> = {
  done: "var(--a3)",
  today: "var(--a1)",
  grace: "#7CC4FF",
  missed: "var(--a2)",
  upcoming: "var(--card)",
};

export const DAY_STATE_LABEL: Record<ChallengeDayState, string> = {
  done: "Hecho",
  today: "Hoy",
  grace: "Día de gracia",
  missed: "Perdido",
  upcoming: "Por venir",
};

export const DAY_STATE_MARK: Record<ChallengeDayState, string> = {
  done: "✓",
  today: "hoy",
  grace: "gracia",
  missed: "✕",
  upcoming: "",
};
