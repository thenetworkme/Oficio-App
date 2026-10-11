import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proves the core claim behind the PWA "don't lose a Pomodoro session"
 * requirement: the persisted zustand store (localStorage, key "oficio-timer")
 * is enough on its own to recover an in-progress focus period after the tab
 * is closed (or the connection drops) and reopened — with no network
 * involved at all, since `getRemainingSeconds()` is wall-clock-based
 * (`Date.now() - startedAt`), not a running interval that resets.
 *
 * Each `vi.resetModules()` + dynamic `import()` below creates a brand new
 * store instance (a fresh module graph, as if the page had been fully
 * reloaded), which must rehydrate purely from whatever the *previous*
 * instance last wrote to localStorage — nothing is passed between them in
 * memory.
 */
describe("timer store survives simulated tab close + reopen mid-focus-period", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recovers the exact remaining time, skill, and intention after rehydrating from localStorage", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    // --- Session 1: user starts a focus period, picks a skill, types an
    // intention, then 7 minutes pass while it's running. ---
    const mod1 = await import("@/store/timer-store");
    await mod1.useTimerStore.persist.rehydrate();

    mod1.useTimerStore.getState().setSkill("skill-guitarra");
    mod1.useTimerStore.getState().setIntention("Practicar escalas pentatónicas");
    mod1.useTimerStore.getState().start();

    const focusTotalSeconds = mod1.useTimerStore.getState().remainingAtStart; // 25:00 by default
    expect(mod1.useTimerStore.getState().running).toBe(true);

    vi.setSystemTime(t0 + 7 * 60_000); // 7 minutes of real wall-clock time pass

    // Sanity check mid-session, before any "close": remaining time already
    // reflects the elapsed 7 minutes purely from startedAt, not a ticking
    // interval.
    expect(mod1.useTimerStore.getState().getRemainingSeconds(t0 + 7 * 60_000)).toBe(
      focusTotalSeconds - 7 * 60,
    );

    // --- "Tab closed" / "connection lost": capture exactly what the
    // persist middleware wrote to localStorage as of this moment. Nothing
    // else happens to the in-memory store after this — it's discarded. ---
    const raw = localStorage.getItem("oficio-timer");
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw!);
    expect(persisted.state.running).toBe(true);
    expect(persisted.state.startedAt).toBe(t0);
    expect(persisted.state.skillId).toBe("skill-guitarra");
    expect(persisted.state.intention).toBe("Practicar escalas pentatónicas");

    // Time keeps passing while the tab is closed / offline (5 more minutes,
    // 12 total) — nothing writes to localStorage during this gap, exactly
    // as would happen with no open tab and no network.
    const t1 = t0 + 12 * 60_000;
    vi.setSystemTime(t1);

    // --- "Tab reopened": a completely fresh module graph (fresh store,
    // fresh in-memory state) rehydrating from the SAME localStorage key
    // the first instance left behind. ---
    vi.resetModules();
    const mod2 = await import("@/store/timer-store");
    await mod2.useTimerStore.persist.rehydrate();

    const rehydrated = mod2.useTimerStore.getState();
    expect(rehydrated.running).toBe(true);
    expect(rehydrated.startedAt).toBe(t0);
    expect(rehydrated.skillId).toBe("skill-guitarra");
    expect(rehydrated.intention).toBe("Practicar escalas pentatónicas");

    // The reopened store must report the remaining time correctly relative
    // to TOTAL elapsed wall-clock time since the original start() (12
    // minutes), not relative to when it was rehydrated.
    expect(rehydrated.getRemainingSeconds(t1)).toBe(focusTotalSeconds - 12 * 60);

    // A further 2 minutes pass after reopening (14 total); the countdown
    // keeps advancing correctly from the rehydrated startedAt.
    const t2 = t0 + 14 * 60_000;
    vi.setSystemTime(t2);
    expect(mod2.useTimerStore.getState().getRemainingSeconds(t2)).toBe(focusTotalSeconds - 14 * 60);
  });

  it("recovers a PAUSED period's exact remaining time too (not just a running one)", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    const mod1 = await import("@/store/timer-store");
    await mod1.useTimerStore.persist.rehydrate();

    mod1.useTimerStore.getState().start();
    vi.setSystemTime(t0 + 3 * 60_000); // 3 minutes running
    mod1.useTimerStore.getState().pause(); // paused with 22:00 left

    const pausedRemaining = mod1.useTimerStore.getState().remainingAtStart;
    expect(mod1.useTimerStore.getState().running).toBe(false);

    const raw = JSON.parse(localStorage.getItem("oficio-timer")!);
    expect(raw.state.running).toBe(false);
    expect(raw.state.startedAt).toBeNull();
    expect(raw.state.remainingAtStart).toBe(pausedRemaining);

    // Close while paused; a long time passes with the tab fully closed —
    // a paused period must NOT keep counting down in the background.
    vi.setSystemTime(t0 + 60 * 60_000);

    vi.resetModules();
    const mod2 = await import("@/store/timer-store");
    await mod2.useTimerStore.persist.rehydrate();

    const rehydrated = mod2.useTimerStore.getState();
    expect(rehydrated.running).toBe(false);
    expect(rehydrated.remainingAtStart).toBe(pausedRemaining);
    // Paused, so getRemainingSeconds must equal the frozen value regardless
    // of how much wall-clock time passed while closed.
    expect(rehydrated.getRemainingSeconds(t0 + 90 * 60_000)).toBe(pausedRemaining);
  });

  it("persists extraSeconds and pendingSave too, so an extend()'d or just-completed period isn't lost on reopen", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    const mod1 = await import("@/store/timer-store");
    await mod1.useTimerStore.persist.rehydrate();

    mod1.useTimerStore.getState().setSkill("skill-pintura");
    mod1.useTimerStore.getState().start();
    mod1.useTimerStore.getState().extend(300);
    mod1.useTimerStore.getState().completeFocusPeriod();

    const pendingSave = mod1.useTimerStore.getState().pendingSave;
    expect(pendingSave).toEqual({ durationMin: 25, pomodoros: 1, skillId: "skill-pintura" });

    vi.resetModules();
    const mod2 = await import("@/store/timer-store");
    await mod2.useTimerStore.persist.rehydrate();

    expect(mod2.useTimerStore.getState().pendingSave).toEqual(pendingSave);
    expect(mod2.useTimerStore.getState().extraSeconds).toBe(0); // reset by completeFocusPeriod, as designed
  });
});
