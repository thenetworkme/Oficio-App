import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Mirrors tests/stopwatch-persistence.test.ts's fresh-module-import-from-
 * localStorage technique, for the break-reminder state specifically: a
 * break countdown in progress must survive a simulated tab close/reopen,
 * recovering the exact remaining time purely from breakStartedAt +
 * breakLengthMin (wall-clock), not from anything that would reset on reload.
 */
describe("stopwatch store — break state survives simulated tab close + reopen", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recovers an in-progress break's exact remaining time after rehydrating from localStorage", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    const mod1 = await import("@/store/stopwatch-store");
    await mod1.useStopwatchStore.persist.rehydrate();

    mod1.useStopwatchStore.getState().setBreakSettings(15, 5);
    mod1.useStopwatchStore.getState().start();
    vi.setSystemTime(t0 + 15 * 60_000);
    mod1.useStopwatchStore.getState().triggerBreak();

    expect(mod1.useStopwatchStore.getState().onBreak).toBe(true);

    // 2 minutes into the 5-minute break, "close the tab".
    const tBreakStart = t0 + 15 * 60_000;
    vi.setSystemTime(tBreakStart + 2 * 60_000);

    const raw = JSON.parse(localStorage.getItem("oficio-stopwatch")!);
    expect(raw.state.onBreak).toBe(true);
    expect(raw.state.breakStartedAt).toBe(tBreakStart);
    expect(raw.state.breakLengthMin).toBe(5);
    expect(raw.state.running).toBe(false);

    // More time passes while fully closed (5 min after break start, i.e.
    // past the 5-minute break length) — nothing writes to localStorage
    // during this gap.
    const t1 = tBreakStart + 6 * 60_000; // 1 min past the break's end
    vi.setSystemTime(t1);

    vi.resetModules();
    const mod2 = await import("@/store/stopwatch-store");
    await mod2.useStopwatchStore.persist.rehydrate();

    const rehydrated = mod2.useStopwatchStore.getState();
    expect(rehydrated.onBreak).toBe(true);
    expect(rehydrated.breakStartedAt).toBe(tBreakStart);
    expect(rehydrated.running).toBe(false); // never auto-resumed just from reopening
    // The countdown itself already reads 0 (overdue) purely from wall-clock
    // math — the page's effect is what would call endBreak() once mounted,
    // but the raw remaining-time computation is correct immediately.
    expect(rehydrated.getBreakRemainingMs(t1)).toBe(0);

    // And if reopened WHILE still within the 5 minutes, it reports the
    // correct remaining time instead of restarting the countdown.
    vi.resetModules();
    const mod3 = await import("@/store/stopwatch-store");
    await mod3.useStopwatchStore.persist.rehydrate();
    const tWithinBreak = tBreakStart + 2 * 60_000;
    expect(mod3.useStopwatchStore.getState().getBreakRemainingMs(tWithinBreak)).toBe(3 * 60_000);
  });

  it("recovers sinceLastBreakMs (paused) correctly too, so the next threshold window isn't corrupted by reopening", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    const mod1 = await import("@/store/stopwatch-store");
    await mod1.useStopwatchStore.persist.rehydrate();

    mod1.useStopwatchStore.getState().setBreakSettings(20, 5);
    mod1.useStopwatchStore.getState().start();
    vi.setSystemTime(t0 + 6 * 60_000);
    mod1.useStopwatchStore.getState().pause(); // 6 min banked toward the 20 min threshold

    const raw = JSON.parse(localStorage.getItem("oficio-stopwatch")!);
    expect(raw.state.sinceLastBreakMs).toBe(6 * 60_000);
    expect(raw.state.running).toBe(false);

    // Tab closed for a long time while paused.
    vi.setSystemTime(t0 + 90 * 60_000);

    vi.resetModules();
    const mod2 = await import("@/store/stopwatch-store");
    await mod2.useStopwatchStore.persist.rehydrate();

    const rehydrated = mod2.useStopwatchStore.getState();
    expect(rehydrated.sinceLastBreakMs).toBe(6 * 60_000);
    // Paused, so it must stay frozen at 6 min regardless of the 90 min gap.
    expect(rehydrated.getMsSinceLastBreak(t0 + 90 * 60_000)).toBe(6 * 60_000);

    // Resuming continues counting from the banked 6 min, not from zero and
    // not from a value inflated by the closed-tab gap.
    rehydrated.resume();
    const t1 = t0 + 90 * 60_000 + 60_000;
    vi.setSystemTime(t1);
    expect(mod2.useStopwatchStore.getState().getMsSinceLastBreak(t1)).toBe(7 * 60_000);
  });

  it("the break-reminder settings themselves (breakReminderMin/breakLengthMin) persist across reopen", async () => {
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));

    const mod1 = await import("@/store/stopwatch-store");
    await mod1.useStopwatchStore.persist.rehydrate();
    mod1.useStopwatchStore.getState().setBreakSettings(25, 8);

    vi.resetModules();
    const mod2 = await import("@/store/stopwatch-store");
    await mod2.useStopwatchStore.persist.rehydrate();

    expect(mod2.useStopwatchStore.getState().breakReminderMin).toBe(25);
    expect(mod2.useStopwatchStore.getState().breakLengthMin).toBe(8);
  });

  it("disabled (breakReminderMin null) persists as disabled, not reset to some default on reopen", async () => {
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));

    const mod1 = await import("@/store/stopwatch-store");
    await mod1.useStopwatchStore.persist.rehydrate();
    expect(mod1.useStopwatchStore.getState().breakReminderMin).toBeNull();

    mod1.useStopwatchStore.getState().start();
    vi.resetModules();
    const mod2 = await import("@/store/stopwatch-store");
    await mod2.useStopwatchStore.persist.rehydrate();

    expect(mod2.useStopwatchStore.getState().breakReminderMin).toBeNull();
  });
});
