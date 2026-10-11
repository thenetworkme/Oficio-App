/**
 * Pure helpers for the "Sesión libre" (free session) stopwatch — mirrors the
 * wall-clock approach in lib/timer.ts (remainingSeconds), but counting UP
 * from zero instead of down from a fixed duration.
 */

/** Minimum elapsed time required to log a free session (see MIN_STOPWATCH_MS note). */
export const MIN_STOPWATCH_MS = 60_000; // 1 minute

/**
 * Elapsed ms computed from wall-clock time rather than a running counter, so
 * it stays exact across a backgrounded tab, sleep, or reload — the same
 * reasoning as lib/timer.ts's remainingSeconds(). `accumulatedMs` is time
 * already banked from previous run segments (before the current pause);
 * while paused there is no current segment, so callers pass `startedAtMs:
 * null` (or just read `accumulatedMs` directly).
 */
export function elapsedMs(startedAtMs: number | null, accumulatedMs: number, nowMs: number): number {
  if (startedAtMs == null) return accumulatedMs;
  return accumulatedMs + Math.max(0, nowMs - startedAtMs);
}

/** Rounds to the nearest full minute (not floored), so e.g. 29.6min -> 30, not 29. */
export function minutesFromElapsedMs(ms: number): number {
  return Math.round(ms / 60_000);
}

/** Whether this elapsed time is long enough to be worth logging as a session. */
export function canSaveElapsedMs(ms: number): boolean {
  return ms >= MIN_STOPWATCH_MS;
}

/** "MM:SS" under an hour, "H:MM:SS" at/after an hour — free sessions can run long. */
export function formatStopwatchClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}
