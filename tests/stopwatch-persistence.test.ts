import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Same claim as tests/timer-persistence.test.ts, for the "Sesión libre"
 * stopwatch: the persisted zustand store (localStorage, key
 * "oficio-stopwatch") is enough on its own to recover an in-progress free
 * session after the tab is closed and reopened, with no network involved,
 * because getElapsedMs() is wall-clock-based (accumulatedMs + Date.now() -
 * startedAt), not a running interval that resets.
 *
 * Each vi.resetModules() + dynamic import() below creates a brand new store
 * instance (a fresh module graph, as if the page had been fully reloaded),
 * which must rehydrate purely from whatever the *previous* instance last
 * wrote to localStorage.
 */
describe("stopwatch store survives simulated tab close + reopen mid-session", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recovers the exact elapsed time, skill, and intention after rehydrating from localStorage", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    // --- Session 1: user starts a free session, picks a skill, types an
    // intention, then 7 minutes pass while it's running. ---
    const mod1 = await import("@/store/stopwatch-store");
    await mod1.useStopwatchStore.persist.rehydrate();

    mod1.useStopwatchStore.getState().setSkill("skill-guitarra");
    mod1.useStopwatchStore.getState().setIntention("Improvisar en La menor");
    mod1.useStopwatchStore.getState().start();

    expect(mod1.useStopwatchStore.getState().running).toBe(true);

    vi.setSystemTime(t0 + 7 * 60_000); // 7 minutes of real wall-clock time pass

    // Sanity check mid-session, before any "close": elapsed already
    // reflects the 7 minutes purely from startedAt, not a ticking interval.
    expect(mod1.useStopwatchStore.getState().getElapsedMs(t0 + 7 * 60_000)).toBe(7 * 60_000);

    // --- "Tab closed": capture exactly what the persist middleware wrote
    // to localStorage. Nothing else happens to the in-memory store after
    // this — it's discarded. ---
    const raw = localStorage.getItem("oficio-stopwatch");
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw!);
    expect(persisted.state.running).toBe(true);
    expect(persisted.state.startedAt).toBe(t0);
    expect(persisted.state.skillId).toBe("skill-guitarra");
    expect(persisted.state.intention).toBe("Improvisar en La menor");

    // Time keeps passing while the tab is closed (5 more minutes, 12
    // total) — nothing writes to localStorage during this gap.
    const t1 = t0 + 12 * 60_000;
    vi.setSystemTime(t1);

    // --- "Tab reopened": a completely fresh module graph rehydrating from
    // the SAME localStorage key the first instance left behind. ---
    vi.resetModules();
    const mod2 = await import("@/store/stopwatch-store");
    await mod2.useStopwatchStore.persist.rehydrate();

    const rehydrated = mod2.useStopwatchStore.getState();
    expect(rehydrated.running).toBe(true);
    expect(rehydrated.startedAt).toBe(t0);
    expect(rehydrated.skillId).toBe("skill-guitarra");
    expect(rehydrated.intention).toBe("Improvisar en La menor");

    // The reopened store must report elapsed time correctly relative to
    // TOTAL elapsed wall-clock time since the original start() (12
    // minutes), not relative to when it was rehydrated.
    expect(rehydrated.getElapsedMs(t1)).toBe(12 * 60_000);

    // A further 2 minutes pass after reopening (14 total); the count-up
    // keeps advancing correctly from the rehydrated startedAt.
    const t2 = t0 + 14 * 60_000;
    vi.setSystemTime(t2);
    expect(mod2.useStopwatchStore.getState().getElapsedMs(t2)).toBe(14 * 60_000);
  });

  it("recovers a PAUSED session's exact elapsed time too (not just a running one)", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    const mod1 = await import("@/store/stopwatch-store");
    await mod1.useStopwatchStore.persist.rehydrate();

    mod1.useStopwatchStore.getState().start();
    vi.setSystemTime(t0 + 3 * 60_000); // 3 minutes running
    mod1.useStopwatchStore.getState().pause(); // paused with 3:00 banked

    const pausedElapsed = mod1.useStopwatchStore.getState().accumulatedMs;
    expect(pausedElapsed).toBe(3 * 60_000);
    expect(mod1.useStopwatchStore.getState().running).toBe(false);

    const raw = JSON.parse(localStorage.getItem("oficio-stopwatch")!);
    expect(raw.state.running).toBe(false);
    expect(raw.state.startedAt).toBeNull();
    expect(raw.state.accumulatedMs).toBe(pausedElapsed);

    // Close while paused; a long time passes with the tab fully closed — a
    // paused free session must NOT keep counting up in the background.
    vi.setSystemTime(t0 + 60 * 60_000);

    vi.resetModules();
    const mod2 = await import("@/store/stopwatch-store");
    await mod2.useStopwatchStore.persist.rehydrate();

    const rehydrated = mod2.useStopwatchStore.getState();
    expect(rehydrated.running).toBe(false);
    expect(rehydrated.accumulatedMs).toBe(pausedElapsed);
    // Paused, so getElapsedMs must equal the frozen value regardless of how
    // much wall-clock time passed while closed.
    expect(rehydrated.getElapsedMs(t0 + 90 * 60_000)).toBe(pausedElapsed);
  });

  it("persists pendingSave too, so a just-stopped session isn't lost on reopen before it's saved", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z").getTime();
    vi.setSystemTime(t0);

    const mod1 = await import("@/store/stopwatch-store");
    await mod1.useStopwatchStore.persist.rehydrate();

    mod1.useStopwatchStore.getState().setSkill("skill-pintura");
    mod1.useStopwatchStore.getState().start();
    vi.setSystemTime(t0 + 10 * 60_000);
    mod1.useStopwatchStore.getState().stop();

    const pendingSave = mod1.useStopwatchStore.getState().pendingSave;
    expect(pendingSave).toEqual({ durationMin: 10, skillId: "skill-pintura" });

    vi.resetModules();
    const mod2 = await import("@/store/stopwatch-store");
    await mod2.useStopwatchStore.persist.rehydrate();

    expect(mod2.useStopwatchStore.getState().pendingSave).toEqual(pendingSave);
    expect(mod2.useStopwatchStore.getState().accumulatedMs).toBe(0); // reset by stop(), as designed
  });
});
