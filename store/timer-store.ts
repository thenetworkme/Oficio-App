import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_DURATIONS,
  modeTotalSeconds,
  nextMode,
  remainingSeconds as computeRemaining,
  type PomodoroDurations,
  type PomodoroMode,
} from "@/lib/timer";

interface TimerState {
  mode: PomodoroMode;
  durations: PomodoroDurations;
  running: boolean;
  /** epoch ms when the current running segment started; null while paused/idle. */
  startedAt: number | null;
  /** seconds remaining as of `startedAt` (or right now, if paused). */
  remainingAtStart: number;
  completedFocusCount: number;
  skillId: string | null;
  intention: string;
  /** set right after a focus period completes, to drive the "save session?" prompt. */
  pendingSave: { durationMin: number; pomodoros: number; skillId: string | null } | null;

  getRemainingSeconds: (now?: number) => number;
  setDurations: (durations: PomodoroDurations) => void;
  setMode: (mode: PomodoroMode) => void;
  setSkill: (skillId: string | null) => void;
  setIntention: (intention: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  /** Skip the current period without crediting it as completed. */
  skip: () => void;
  /** Called by the ticking component once the countdown hits zero. */
  completeFocusPeriod: () => void;
  clearPendingSave: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: "focus",
      durations: DEFAULT_DURATIONS,
      running: false,
      startedAt: null,
      remainingAtStart: modeTotalSeconds("focus", DEFAULT_DURATIONS),
      completedFocusCount: 0,
      skillId: null,
      intention: "",
      pendingSave: null,

      getRemainingSeconds(now = Date.now()) {
        const { running, startedAt, remainingAtStart } = get();
        if (!running || startedAt == null) return remainingAtStart;
        return computeRemaining(startedAt, remainingAtStart, now);
      },

      setDurations(durations) {
        set((s) => {
          if (s.running) return { durations };
          const unchanged =
            s.durations.focusMin === durations.focusMin &&
            s.durations.shortMin === durations.shortMin &&
            s.durations.longMin === durations.longMin;
          if (unchanged) return { durations };
          // Only snap remainingAtStart to the new total when the countdown
          // hasn't been touched yet; otherwise a paused/in-progress period
          // would get silently reset to the full duration (e.g. every time
          // this runs again on remount, since the profile sync effect that
          // calls setDurations fires on every mount of the timer screen).
          const wasUntouched = s.remainingAtStart === modeTotalSeconds(s.mode, s.durations);
          return {
            durations,
            remainingAtStart: wasUntouched ? modeTotalSeconds(s.mode, durations) : s.remainingAtStart,
          };
        });
      },

      setMode(mode) {
        set((s) => ({ mode, running: false, startedAt: null, remainingAtStart: modeTotalSeconds(mode, s.durations) }));
      },

      setSkill(skillId) {
        set({ skillId });
      },

      setIntention(intention) {
        set({ intention });
      },

      start() {
        set((s) => {
          if (s.running) return s;
          const remaining = get().getRemainingSeconds();
          return { running: true, startedAt: Date.now(), remainingAtStart: remaining };
        });
      },

      pause() {
        set((s) => {
          if (!s.running) return s;
          const remaining = get().getRemainingSeconds();
          return { running: false, startedAt: null, remainingAtStart: remaining };
        });
      },

      reset() {
        set((s) => ({
          running: false,
          startedAt: null,
          remainingAtStart: modeTotalSeconds(s.mode, s.durations),
        }));
      },

      skip() {
        set((s) => {
          const next = nextMode(s.mode, s.completedFocusCount);
          return {
            mode: next,
            running: false,
            startedAt: null,
            remainingAtStart: modeTotalSeconds(next, s.durations),
          };
        });
      },

      completeFocusPeriod() {
        set((s) => {
          const wasFocus = s.mode === "focus";
          const completed = wasFocus ? s.completedFocusCount + 1 : s.completedFocusCount;
          const next = nextMode(s.mode, completed);
          const pendingSave = wasFocus
            ? { durationMin: s.durations.focusMin, pomodoros: 1, skillId: s.skillId }
            : s.pendingSave;
          return {
            mode: next,
            running: false,
            startedAt: null,
            remainingAtStart: modeTotalSeconds(next, s.durations),
            completedFocusCount: completed,
            pendingSave,
          };
        });
      },

      clearPendingSave() {
        set({ pendingSave: null });
      },
    }),
    {
      name: "oficio-timer",
      partialize: (s) => ({
        mode: s.mode,
        durations: s.durations,
        running: s.running,
        startedAt: s.startedAt,
        remainingAtStart: s.remainingAtStart,
        completedFocusCount: s.completedFocusCount,
        skillId: s.skillId,
        intention: s.intention,
        pendingSave: s.pendingSave,
      }),
    },
  ),
);
