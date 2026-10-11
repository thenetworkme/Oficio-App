import { act, render, screen } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimerStore } from "@/store/timer-store";
import { DEFAULT_DURATIONS, modeTotalSeconds } from "@/lib/timer";

/**
 * Mirrors the exact `now` + ticking-effect pattern used by
 * app/(app)/temporizador/page.tsx, without pulling in Firebase/auth. Exists
 * to catch the specific bug where resuming after a pause briefly displayed
 * an inflated remaining time because `now` had gone stale while paused.
 */
function TimerClock() {
  const store = useTimerStore();
  const [now, setNow] = useState(() => Date.now());

  useLayoutEffect(() => {
    if (!store.running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [store.running]);

  return <span data-testid="remaining">{store.getRemainingSeconds(now)}</span>;
}

describe("temporizador clock sync (regression: stale `now` after resuming a pause)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the correct remaining time immediately on resume, even after a long pause", () => {
    render(<TimerClock />);

    // Start, let 10s of real running time pass, then pause.
    act(() => useTimerStore.getState().start());
    act(() => vi.advanceTimersByTime(10_000));
    act(() => useTimerStore.getState().pause());

    expect(useTimerStore.getState().remainingAtStart).toBe(1500 - 10);

    // Stay paused for a long while — long enough that, if `now` goes stale,
    // resuming would show a badly inflated time until the next 1s tick.
    act(() => vi.advanceTimersByTime(5 * 60_000));

    // Resume. With the fix, `now` is resynced synchronously (useLayoutEffect)
    // before this render is observed, so remaining must already be correct —
    // not inflated by the 5 minutes spent paused.
    act(() => useTimerStore.getState().start());

    const shown = Number(screen.getByTestId("remaining").textContent);
    expect(shown).toBe(1500 - 10);
    expect(shown).toBeLessThanOrEqual(1500);
  });
});
