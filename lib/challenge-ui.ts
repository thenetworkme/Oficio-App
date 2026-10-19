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

/**
 * Shared per-state treatment for a challenge day dot/circle, used by the
 * Retos list's compressed dot row and the detail board's day-circle grid.
 *
 * Punto redesign note: the old mapping filled every non-upcoming state with
 * one of the deprecated --a1/--a2/--a3 aliases, which the Phase-1 token
 * remap collapses to all-equal---signal (see app/globals.css's big comment)
 * — that would have made "done" and "today" visually identical. Instead
 * this follows the reference's own convention (PuntoRetoDetalle.dc.html):
 * "done" is a solid --ink fill, "today" is the single --signal highlight,
 * and every other state is just an outline (border only, transparent fill)
 * so --signal stays the one accent on the screen. `fg` is the day-number
 * text color for that state; `dot` is a flat fill for the small compressed
 * dot row, where an outline wouldn't read at that size.
 */
export const DAY_STATE_STYLE: Record<ChallengeDayState, { bg: string; border: string; fg: string; dot: string }> = {
  done: { bg: "var(--ink)", border: "var(--ink)", fg: "var(--paper)", dot: "var(--ink)" },
  today: { bg: "var(--signal)", border: "var(--signal)", fg: "var(--ink-solid)", dot: "var(--signal)" },
  grace: { bg: "transparent", border: "var(--border-hover)", fg: "var(--muted)", dot: "var(--border-hover)" },
  missed: { bg: "transparent", border: "var(--danger)", fg: "var(--danger)", dot: "var(--danger)" },
  upcoming: { bg: "transparent", border: "var(--line)", fg: "var(--muted)", dot: "var(--line)" },
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
