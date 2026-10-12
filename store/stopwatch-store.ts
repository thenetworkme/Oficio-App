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

  // --- Libre break-reminder settings/state ------------------------------
  // Optional, opt-in feature: after N minutes of actual RUNNING time (not
  // counting paused time) since the last break, auto-pause the stopwatch
  // and start an M-minute break countdown. Both N (breakReminderMin) and M
  // (breakLengthMin) are user-configurable and persisted on Profile (see
  // lib/types.ts); this store just mirrors whatever the profile sync effect
  // in temporizador/page.tsx hands it via setBreakSettings().
  /** Minutes of RUNNING elapsed time before a break triggers. null (or 0) means disabled — the default. */
  breakReminderMin: number | null;
  /** Break duration in minutes. */
  breakLengthMin: number;
  /** Whether a break is currently active (stopwatch is paused because of it). */
  onBreak: boolean;
  /** epoch ms when the current break began; null while not on break. Wall-clock based, same resilience pattern as startedAt — survives a tab close/reopen mid-break. */
  breakStartedAt: number | null;
  /**
   * ms of RUNNING time banked toward the break threshold since the last
   * break ended (or since this run started, if no break yet). Tracked the
   * same wall-clock way as accumulatedMs: it's the baseline as of the start
   * of the current running segment, so pause()/resume() bank/restore it
   * exactly like accumulatedMs, and it's zeroed by start(), reset(), a
   * successful stop(), and endBreak().
   */
  sinceLastBreakMs: number;

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

  /** Updates the break-reminder settings (minutes before a break, break length). */
  setBreakSettings: (reminderMin: number | null, lengthMin: number) => void;
  /** ms of RUNNING time accumulated since the last break ended, wall-clock based like getElapsedMs. */
  getMsSinceLastBreak: (now?: number) => number;
  /**
   * Triggers a break: pauses the running stopwatch (banking elapsed time,
   * same as pause()) and starts the break countdown. No-op if already on
   * break or not running.
   */
  triggerBreak: () => void;
  /** ms remaining in the current break countdown, wall-clock based, clamped at 0. 0 if not on break. */
  getBreakRemainingMs: (now?: number) => number;
  /**
   * Ends the current break — whether the countdown reached 0 or the user
   * skipped it manually — WITHOUT auto-resuming: the stopwatch stays
   * paused, same as it already is after any pause(). Resets the
   * since-last-break tracker to 0 so the next threshold window starts
   * fresh once the user resumes.
   */
  endBreak: () => void;
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

      breakReminderMin: null,
      breakLengthMin: 5,
      onBreak: false,
      breakStartedAt: null,
      sinceLastBreakMs: 0,

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
          return {
            running: true,
            startedAt: Date.now(),
            accumulatedMs: 0,
            // A brand new session from zero naturally restarts the
            // break-reminder window too, and can't start mid-break.
            sinceLastBreakMs: 0,
            onBreak: false,
            breakStartedAt: null,
          };
        });
      },

      pause() {
        set((s) => {
          if (!s.running) return s;
          const elapsed = get().getElapsedMs();
          const sinceBreak = get().getMsSinceLastBreak();
          return { running: false, startedAt: null, accumulatedMs: elapsed, sinceLastBreakMs: sinceBreak };
        });
      },

      resume() {
        set((s) => {
          if (s.running) return s;
          return { running: true, startedAt: Date.now() };
        });
      },

      reset() {
        set({
          running: false,
          startedAt: null,
          accumulatedMs: 0,
          onBreak: false,
          breakStartedAt: null,
          sinceLastBreakMs: 0,
        });
      },

      stop() {
        const elapsed = get().getElapsedMs();
        if (!canSaveElapsedMs(elapsed)) {
          // Too short to log: just pauses (banks the time, including the
          // since-last-break tracker) so resuming keeps counting correctly
          // — same treatment as pause(). A break in progress is still
          // discarded: hitting "Detener" is a deliberate end-of-session
          // action, so there's no reason to leave a countdown running for a
          // session that isn't actively continuing from fullscreen/panel.
          const sinceBreak = get().getMsSinceLastBreak();
          set({
            running: false,
            startedAt: null,
            accumulatedMs: elapsed,
            sinceLastBreakMs: sinceBreak,
            onBreak: false,
            breakStartedAt: null,
          });
          return false;
        }
        set((s) => ({
          running: false,
          startedAt: null,
          accumulatedMs: 0,
          pendingSave: { durationMin: minutesFromElapsedMs(elapsed), skillId: s.skillId },
          onBreak: false,
          breakStartedAt: null,
          sinceLastBreakMs: 0,
        }));
        return true;
      },

      clearPendingSave() {
        set({ pendingSave: null });
      },

      setBreakSettings(reminderMin, lengthMin) {
        set({ breakReminderMin: reminderMin, breakLengthMin: lengthMin });
      },

      getMsSinceLastBreak(now = Date.now()) {
        const { running, startedAt, sinceLastBreakMs } = get();
        return computeElapsed(running ? startedAt : null, sinceLastBreakMs, now);
      },

      triggerBreak() {
        set((s) => {
          if (s.onBreak || !s.running) return s;
          const elapsed = get().getElapsedMs();
          return {
            running: false,
            startedAt: null,
            accumulatedMs: elapsed,
            onBreak: true,
            breakStartedAt: Date.now(),
          };
        });
      },

      getBreakRemainingMs(now = Date.now()) {
        const { onBreak, breakStartedAt, breakLengthMin } = get();
        if (!onBreak || breakStartedAt == null) return 0;
        return Math.max(0, breakLengthMin * 60_000 - (now - breakStartedAt));
      },

      endBreak() {
        set({ onBreak: false, breakStartedAt: null, sinceLastBreakMs: 0 });
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
        breakReminderMin: s.breakReminderMin,
        breakLengthMin: s.breakLengthMin,
        onBreak: s.onBreak,
        breakStartedAt: s.breakStartedAt,
        sinceLastBreakMs: s.sinceLastBreakMs,
      }),
    },
  ),
);
