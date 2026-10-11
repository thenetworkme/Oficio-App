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
});
