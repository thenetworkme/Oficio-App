export const MIN_SESSION_MINUTES = 15;
export const MAX_SESSION_MINUTES = 720; // 12h
export const SESSION_STEP_MINUTES = 15;

export const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120, 180];

export function clampMinutes(minutes: number): number {
  const stepped = Math.round(minutes / SESSION_STEP_MINUTES) * SESSION_STEP_MINUTES;
  return Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, stepped));
}

export function incrementMinutes(minutes: number): number {
  return Math.min(MAX_SESSION_MINUTES, minutes + SESSION_STEP_MINUTES);
}

export function decrementMinutes(minutes: number): number {
  return Math.max(MIN_SESSION_MINUTES, minutes - SESSION_STEP_MINUTES);
}
