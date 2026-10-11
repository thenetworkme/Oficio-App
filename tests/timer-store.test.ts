import { beforeEach, describe, expect, it } from "vitest";
import { useTimerStore } from "@/store/timer-store";
import { DEFAULT_DURATIONS, modeTotalSeconds } from "@/lib/timer";

describe("timer store", () => {
  beforeEach(() => {
    useTimerStore.setState({
      mode: "focus",
      durations: DEFAULT_DURATIONS,
      running: false,
      startedAt: null,
      remainingAtStart: modeTotalSeconds("focus", DEFAULT_DURATIONS),
      completedFocusCount: 0,
      skillId: null,
      intention: "",
      extraSeconds: 0,
      pendingSave: null,
    });
  });

  it("keeps the paused remaining time when setDurations is called again with the same values", () => {
    const { start, pause, setDurations } = useTimerStore.getState();

    start();
    // Pretend some time elapsed by moving remainingAtStart back manually,
    // simulating pause() having captured a mid-countdown value.
    useTimerStore.setState({ remainingAtStart: 1200 }); // paused with 20:00 left
    pause();
    expect(useTimerStore.getState().remainingAtStart).toBe(1200);

    // Simulate the timer screen remounting: its profile-sync effect calls
    // setDurations again with the exact same values that are already set.
    setDurations(DEFAULT_DURATIONS);

    expect(useTimerStore.getState().remainingAtStart).toBe(1200);
    expect(useTimerStore.getState().running).toBe(false);
  });

  it("still snaps to the new total when durations actually change on a fresh (untouched) timer", () => {
    const { setDurations } = useTimerStore.getState();
    setDurations({ focusMin: 50, shortMin: 5, longMin: 15 });
    expect(useTimerStore.getState().remainingAtStart).toBe(50 * 60);
  });

  it("does not reset an in-progress pause even when durations genuinely change", () => {
    const { start, pause, setDurations } = useTimerStore.getState();
    start();
    useTimerStore.setState({ remainingAtStart: 900 }); // paused with 15:00 left of a 25:00 focus
    pause();

    setDurations({ focusMin: 50, shortMin: 5, longMin: 15 });

    expect(useTimerStore.getState().remainingAtStart).toBe(900);
  });

  it("resumes from the exact paused value on the next start()", () => {
    const { start, pause } = useTimerStore.getState();
    start();
    useTimerStore.setState({ remainingAtStart: 777 });
    pause();

    const before = Date.now();
    start();
    const state = useTimerStore.getState();
    expect(state.running).toBe(true);
    expect(state.startedAt).toBeGreaterThanOrEqual(before);
    expect(state.remainingAtStart).toBe(777);
    expect(state.getRemainingSeconds(state.startedAt!)).toBe(777);
  });

  it("extend() adds seconds to the remaining time while paused", () => {
    const { pause, extend } = useTimerStore.getState();
    useTimerStore.setState({ remainingAtStart: 300 });
    pause();

    extend(120);

    const state = useTimerStore.getState();
    expect(state.remainingAtStart).toBe(420);
    expect(state.extraSeconds).toBe(120);
    expect(state.getRemainingSeconds()).toBe(420);
  });

  it("extend() adds seconds to the remaining time while running, without losing elapsed time", () => {
    const { start, extend, getRemainingSeconds } = useTimerStore.getState();
    useTimerStore.setState({ remainingAtStart: 1500 });
    start();
    const startedAt = useTimerStore.getState().startedAt!;

    // 10 real seconds elapse before the extend() click.
    const tPlus10 = startedAt + 10_000;
    expect(getRemainingSeconds(tPlus10)).toBe(1490);

    extend(300);
    const state = useTimerStore.getState();
    expect(state.extraSeconds).toBe(300);
    // Elapsed time (10s) is still accounted for; only the extension is added.
    expect(getRemainingSeconds(tPlus10)).toBe(1790);
    expect(state.startedAt).toBe(startedAt);
  });

  it("extend() accumulates across multiple calls", () => {
    const { extend } = useTimerStore.getState();
    extend(300);
    extend(120);
    expect(useTimerStore.getState().extraSeconds).toBe(420);
  });

  it("resets extraSeconds when the period resets (skip/completeFocusPeriod/setMode/reset)", () => {
    const { extend, skip, completeFocusPeriod, setMode, reset } = useTimerStore.getState();

    extend(300);
    expect(useTimerStore.getState().extraSeconds).toBe(300);
    skip();
    expect(useTimerStore.getState().extraSeconds).toBe(0);

    extend(300);
    completeFocusPeriod();
    expect(useTimerStore.getState().extraSeconds).toBe(0);

    extend(300);
    setMode("short");
    expect(useTimerStore.getState().extraSeconds).toBe(0);

    extend(300);
    reset();
    expect(useTimerStore.getState().extraSeconds).toBe(0);
  });
});
