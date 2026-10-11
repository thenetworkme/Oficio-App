export type PomodoroMode = "focus" | "short" | "long";

export interface PomodoroDurations {
  focusMin: number;
  shortMin: number;
  longMin: number;
}

export const DEFAULT_DURATIONS: PomodoroDurations = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
};

export function modeTotalSeconds(mode: PomodoroMode, durations: PomodoroDurations): number {
  const minutes =
    mode === "focus" ? durations.focusMin : mode === "short" ? durations.shortMin : durations.longMin;
  return minutes * 60;
}

/**
 * Remaining seconds computed from wall-clock time rather than a decrementing
 * counter, so the timer stays exact across a backgrounded tab or a reload.
 */
export function remainingSeconds(startedAtMs: number, totalSeconds: number, nowMs: number): number {
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.max(0, totalSeconds - elapsed);
}

/** Every 4th completed focus Pomodoro is followed by a long break. */
export function nextMode(currentMode: PomodoroMode, completedFocusCount: number): PomodoroMode {
  if (currentMode !== "focus") return "focus";
  return completedFocusCount > 0 && completedFocusCount % 4 === 0 ? "long" : "short";
}

export function cycleDotsFilled(completedFocusCount: number, currentMode: PomodoroMode): number {
  const mod = completedFocusCount % 4;
  if (completedFocusCount > 0 && mod === 0 && currentMode !== "focus") return 4;
  return mod;
}
