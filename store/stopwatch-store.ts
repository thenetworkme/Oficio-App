import { create } from "zustand";
import { persist } from "zustand/middleware";
import { canSaveElapsedMs, elapsedMs as computeElapsed, minutesFromElapsedMs } from "@/lib/stopwatch";

interface StopwatchState {
  running: boolean;
  /** epoch ms when the current running segment began; null while paused/idle. */
  startedAt: number | null;
  /** ms banked from previous run segments, before the current pause/idle state. */
  accumulatedMs: number;
  skillId: string | null;
  intention: string;
  /** set right after stop() ends a long-enough session, to drive the "save session?" dialog. */
  pendingSave: { durationMin: number; skillId: string | null } | null;

  getElapsedMs: (now?: number) => number;
  setSkill: (skillId: string | null) => void;
  setIntention: (intention: string) => void;
  /** Begins a brand new run from zero. */
  start: () => void;
  /** Pauses the current run, banking elapsed time into accumulatedMs. */
  pause: () => void;
  /** Continues a paused run without resetting the time already banked. */
  resume: () => void;
  /** Discards everything (time, not just pause state) and goes back to zero. */
  reset: () => void;
  /**
   * Ends the current run and, if long enough to be worth logging
   * (canSaveElapsedMs), banks the final elapsed time into pendingSave for
   * the save dialog. If too short, it just pauses (banking the time) so the
   * user can resume and keep practicing instead of silently losing it.
   * Returns whether the session was long enough to prepare for saving.
   */
  stop: () => boolean;
  clearPendingSave: () => void;
}

export const useStopwatchStore = create<StopwatchState>()(
  persist(
    (set, get) => ({
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      skillId: null,
      intention: "",
      pendingSave: null,

      getElapsedMs(now = Date.now()) {
        const { running, startedAt, accumulatedMs } = get();
        return computeElapsed(running ? startedAt : null, accumulatedMs, now);
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
          return { running: true, startedAt: Date.now(), accumulatedMs: 0 };
        });
      },

      pause() {
        set((s) => {
          if (!s.running) return s;
          const elapsed = get().getElapsedMs();
          return { running: false, startedAt: null, accumulatedMs: elapsed };
        });
      },

      resume() {
        set((s) => {
          if (s.running) return s;
          return { running: true, startedAt: Date.now() };
        });
      },

      reset() {
        set({ running: false, startedAt: null, accumulatedMs: 0 });
      },

      stop() {
        const elapsed = get().getElapsedMs();
        if (!canSaveElapsedMs(elapsed)) {
          set({ running: false, startedAt: null, accumulatedMs: elapsed });
          return false;
        }
        set((s) => ({
          running: false,
          startedAt: null,
          accumulatedMs: 0,
          pendingSave: { durationMin: minutesFromElapsedMs(elapsed), skillId: s.skillId },
        }));
        return true;
      },

      clearPendingSave() {
        set({ pendingSave: null });
      },
    }),
    {
      name: "oficio-stopwatch",
      partialize: (s) => ({
        running: s.running,
        startedAt: s.startedAt,
        accumulatedMs: s.accumulatedMs,
        skillId: s.skillId,
        intention: s.intention,
        pendingSave: s.pendingSave,
      }),
    },
  ),
);
