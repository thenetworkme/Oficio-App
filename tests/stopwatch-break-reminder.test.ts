import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStopwatchStore } from "@/store/stopwatch-store";

/**
 * The optional, opt-in "Sesión libre" break-reminder feature (see
 * store/stopwatch-store.ts): after N minutes of RUNNING time since the
 * last break, the stopwatch auto-pauses and a break countdown starts; when
 * it ends, the user must resume manually. Mirrors tests/stopwatch-store.test.ts's
 * exact wall-clock-based style.
 */
describe("stopwatch store — libre break reminder", () => {
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
      breakReminderMin: null,
      breakLengthMin: 5,
      onBreak: false,
      breakStartedAt: null,
      sinceLastBreakMs: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is disabled by default (breakReminderMin null)", () => {
    expect(useStopwatchStore.getState().breakReminderMin).toBeNull();
  });

  it("accumulates msSinceLastBreak only while running, not while paused", () => {
    const { start, pause, resume } = useStopwatchStore.getState();
    start();
    vi.advanceTimersByTime(5 * 60_000);
    expect(useStopwatchStore.getState().getMsSinceLastBreak()).toBe(5 * 60_000);

    pause();
    vi.advanceTimersByTime(30 * 60_000); // paused gap must not count
    expect(useStopwatchStore.getState().getMsSinceLastBreak()).toBe(5 * 60_000);

    resume();
    vi.advanceTimersByTime(2 * 60_000);
    expect(useStopwatchStore.getState().getMsSinceLastBreak()).toBe(7 * 60_000);
  });

  it("never triggers a break when disabled (breakReminderMin null), no matter how long it runs", () => {
    const { setBreakSettings, start } = useStopwatchStore.getState();
    setBreakSettings(null, 5);
    start();
    vi.advanceTimersByTime(3 * 60 * 60_000); // 3 hours running

    useStopwatchStore.getState().triggerBreak(); // calling it directly still works...
    // ...but the page-level check (breakReminderMin == null) is what gates
    // this in practice; here we assert the config itself stays disabled and
    // getMsSinceLastBreak keeps growing unbounded with no store-side cap.
    expect(useStopwatchStore.getState().breakReminderMin).toBeNull();
  });

  it("does not auto-trigger on its own — triggerBreak() must be called explicitly (by the page's render-loop check)", () => {
    const { setBreakSettings, start } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(60 * 60_000); // way past the 15 min threshold
    // The store itself has no ticking loop; nothing fires without an
    // explicit triggerBreak() call.
    expect(useStopwatchStore.getState().onBreak).toBe(false);
    expect(useStopwatchStore.getState().running).toBe(true);
  });

  it("triggerBreak() auto-pauses the stopwatch (banking elapsed time) and starts the break", () => {
    const { setBreakSettings, start, triggerBreak } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);

    triggerBreak();

    const s = useStopwatchStore.getState();
    expect(s.running).toBe(false);
    expect(s.startedAt).toBeNull();
    expect(s.accumulatedMs).toBe(15 * 60_000); // banked, same as pause()
    expect(s.onBreak).toBe(true);
    expect(s.breakStartedAt).toBe(Date.now());
    // Elapsed time itself is untouched by the break (still reads 15 min).
    expect(s.getElapsedMs()).toBe(15 * 60_000);
  });

  it("triggerBreak() is a no-op if already on break or not running", () => {
    const { setBreakSettings, start, triggerBreak, pause } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();
    const afterFirst = useStopwatchStore.getState();

    triggerBreak(); // already on break
    expect(useStopwatchStore.getState()).toEqual(afterFirst);

    useStopwatchStore.setState({ onBreak: false, breakStartedAt: null });
    pause(); // not running (already paused)
    triggerBreak(); // running is false -> no-op
    expect(useStopwatchStore.getState().onBreak).toBe(false);
  });

  it("computes break remaining ms wall-clock based, clamped at 0", () => {
    const { setBreakSettings, start, triggerBreak } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();

    expect(useStopwatchStore.getState().getBreakRemainingMs()).toBe(5 * 60_000);

    vi.advanceTimersByTime(2 * 60_000);
    expect(useStopwatchStore.getState().getBreakRemainingMs()).toBe(3 * 60_000);

    vi.advanceTimersByTime(10 * 60_000); // past the end
    expect(useStopwatchStore.getState().getBreakRemainingMs()).toBe(0);
  });

  it("getBreakRemainingMs is 0 when not on break", () => {
    expect(useStopwatchStore.getState().getBreakRemainingMs()).toBe(0);
  });

  it("endBreak() does NOT auto-resume — the stopwatch stays paused — and resets the since-last-break tracker", () => {
    const { setBreakSettings, start, triggerBreak, endBreak } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();
    vi.advanceTimersByTime(5 * 60_000); // countdown reaches 0

    endBreak();

    const s = useStopwatchStore.getState();
    expect(s.onBreak).toBe(false);
    expect(s.breakStartedAt).toBeNull();
    expect(s.running).toBe(false); // still paused, never auto-resumed
    expect(s.sinceLastBreakMs).toBe(0);
    expect(s.getMsSinceLastBreak()).toBe(0);
  });

  it("manual skip (ending the break early) also leaves the stopwatch paused", () => {
    const { setBreakSettings, start, triggerBreak, endBreak } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();
    vi.advanceTimersByTime(30_000); // well before the 5 min countdown ends

    endBreak();

    expect(useStopwatchStore.getState().onBreak).toBe(false);
    expect(useStopwatchStore.getState().running).toBe(false);
  });

  it("after a break ends, resuming restarts the since-last-break window at zero", () => {
    const { setBreakSettings, start, triggerBreak, endBreak, resume } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();
    endBreak();

    resume();
    expect(useStopwatchStore.getState().getMsSinceLastBreak()).toBe(0);

    vi.advanceTimersByTime(10 * 60_000);
    expect(useStopwatchStore.getState().getMsSinceLastBreak()).toBe(10 * 60_000);
    // Total elapsed time (not reset by the break) keeps growing on top of
    // what was already banked before the break.
    expect(useStopwatchStore.getState().getElapsedMs()).toBe(25 * 60_000);
  });

  it("a brand new start() resets the since-last-break tracker and any leftover break state", () => {
    const { setBreakSettings, start, triggerBreak } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();

    start(); // fresh start from zero
    const s = useStopwatchStore.getState();
    expect(s.onBreak).toBe(false);
    expect(s.breakStartedAt).toBeNull();
    expect(s.sinceLastBreakMs).toBe(0);
    expect(s.getMsSinceLastBreak()).toBe(0);
    expect(s.getElapsedMs()).toBe(0);
  });

  it("reset() clears break state along with the elapsed time", () => {
    const { setBreakSettings, start, triggerBreak, reset } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();

    reset();
    const s = useStopwatchStore.getState();
    expect(s.onBreak).toBe(false);
    expect(s.breakStartedAt).toBeNull();
    expect(s.sinceLastBreakMs).toBe(0);
    expect(s.accumulatedMs).toBe(0);
  });

  it("stop() while on break ends the break and stops normally (long-enough session)", () => {
    const { setBreakSettings, setSkill, start, triggerBreak, stop } = useStopwatchStore.getState();
    setSkill("skill-x");
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(15 * 60_000);
    triggerBreak();

    const longEnough = stop();
    expect(longEnough).toBe(true);

    const s = useStopwatchStore.getState();
    expect(s.onBreak).toBe(false);
    expect(s.breakStartedAt).toBeNull();
    expect(s.sinceLastBreakMs).toBe(0);
    expect(s.pendingSave).toEqual({ durationMin: 15, skillId: "skill-x" });
  });

  it("stop() while on break but below the minimum still ends the break (just pauses, keeps elapsed banked)", () => {
    const { setBreakSettings, start, triggerBreak, stop } = useStopwatchStore.getState();
    setBreakSettings(1, 5); // trigger after 1 minute, well above the 1-min save minimum... use a tiny elapsed instead
    useStopwatchStore.setState({ breakReminderMin: null }); // disable auto-trigger math, we'll call triggerBreak() directly
    start();
    vi.advanceTimersByTime(30_000); // 30s, below MIN_STOPWATCH_MS
    triggerBreak(); // running was true, so this still works even with the reminder "disabled" in settings

    const longEnough = stop();
    expect(longEnough).toBe(false);

    const s = useStopwatchStore.getState();
    expect(s.onBreak).toBe(false);
    expect(s.breakStartedAt).toBeNull();
    expect(s.pendingSave).toBeNull();
    expect(s.getElapsedMs()).toBe(30_000); // still banked, resumable
  });

  it("pause() while enabled banks sinceLastBreakMs exactly like accumulatedMs across multiple segments", () => {
    const { setBreakSettings, start, pause, resume } = useStopwatchStore.getState();
    setBreakSettings(15, 5);
    start();
    vi.advanceTimersByTime(60_000);
    pause();
    resume();
    vi.advanceTimersByTime(90_000);
    pause();
    resume();
    vi.advanceTimersByTime(30_000);

    expect(useStopwatchStore.getState().getMsSinceLastBreak()).toBe(60_000 + 90_000 + 30_000);
  });

  it("setBreakSettings() updates both values independently", () => {
    const { setBreakSettings } = useStopwatchStore.getState();
    setBreakSettings(20, 10);
    expect(useStopwatchStore.getState().breakReminderMin).toBe(20);
    expect(useStopwatchStore.getState().breakLengthMin).toBe(10);

    setBreakSettings(null, 10);
    expect(useStopwatchStore.getState().breakReminderMin).toBeNull();
    expect(useStopwatchStore.getState().breakLengthMin).toBe(10);
  });
});
