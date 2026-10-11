import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStopwatchStore } from "@/store/stopwatch-store";

describe("stopwatch store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    useStopwatchStore.setState({
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      skillId: null,
      intention: "",
      pendingSave: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts elapsed time UP from zero while running, wall-clock based", () => {
    const { start } = useStopwatchStore.getState();
    start();
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(0);

    vi.advanceTimersByTime(5 * 60_000);
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(5 * 60_000);
  });

  it("freezes elapsed time while paused, and does NOT keep growing in the background", () => {
    const { start, pause } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(3 * 60_000);
    pause();

    const pausedElapsed = useStopwatchStore.getState().getElapsedMs();
    expect(pausedElapsed).toBe(3 * 60_000);
    expect(useStopwatchStore.getState().running).toBe(false);

    // A long gap passes while paused (e.g. tab backgrounded or closed) —
    // elapsed must stay exactly where it was.
    vi.advanceTimersByTime(60 * 60_000);
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(pausedElapsed);
  });

  it("resumes and keeps adding on top of the banked time, not resetting to zero", () => {
    const { start, pause, resume } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(2 * 60_000); // 2 min
    pause();
    vi.advanceTimersByTime(30 * 60_000); // gap while paused, must not count

    resume();
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(2 * 60_000); // unchanged right at resume

    vi.advanceTimersByTime(4 * 60_000); // 4 more min running
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(6 * 60_000);
  });

  it("supports multiple pause/resume cycles, accumulating correctly across each segment", () => {
    const { start, pause, resume } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(60_000); // seg 1: 1 min
    pause();
    resume();
    vi.advanceTimersByTime(90_000); // seg 2: 1.5 min
    pause();
    resume();
    vi.advanceTimersByTime(30_000); // seg 3: 0.5 min
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(60_000 + 90_000 + 30_000);
  });

  it("reset() discards everything, going back to zero whether running or paused", () => {
    const { start, reset } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(10 * 60_000);
    reset();

    const s = useStopwatchStore.getState();
    expect(s.running).toBe(false);
    expect(s.startedAt).toBeNull();
    expect(s.accumulatedMs).toBe(0);
    expect(s.getElapsedMs()).toBe(0);
  });

  it("start() always begins a fresh run from zero, even if called again after accumulating time", () => {
    const { start, pause } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(60_000);
    pause();

    start(); // fresh start, not resume
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(0);
  });

  it("stop() below the 1-minute minimum pauses (banking elapsed time) but does NOT create a pendingSave", () => {
    const { start, stop } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(30_000); // 30s, below the minimum

    const longEnough = stop();
    expect(longEnough).toBe(false);

    const s = useStopwatchStore.getState();
    expect(s.pendingSave).toBeNull();
    expect(s.running).toBe(false);
    // The 30s isn't discarded — resuming should let the user keep going.
    expect(s.getElapsedMs()).toBe(30_000);
  });

  it("stop() at/above the minimum creates a pendingSave with the rounded minutes and resets accumulatedMs", () => {
    const { start, stop, setSkill } = useStopwatchStore.getState();
    setSkill("skill-guitarra");
    start();
    vi.advanceTimersByTime(29.6 * 60_000); // rounds to 30

    const longEnough = stop();
    expect(longEnough).toBe(true);

    const s = useStopwatchStore.getState();
    expect(s.pendingSave).toEqual({ durationMin: 30, skillId: "skill-guitarra" });
    expect(s.running).toBe(false);
    expect(s.accumulatedMs).toBe(0);
    expect(s.getElapsedMs()).toBe(0);
  });

  it("clearPendingSave() clears pendingSave without touching the (already-zeroed) elapsed state", () => {
    const { start, stop, clearPendingSave } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(5 * 60_000);
    stop();
    expect(useStopwatchStore.getState().pendingSave).not.toBeNull();

    clearPendingSave();
    expect(useStopwatchStore.getState().pendingSave).toBeNull();
  });
});
