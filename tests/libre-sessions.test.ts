import { describe, expect, it } from "vitest";
import { summarizeLibreSessions } from "@/lib/libre-sessions";
import type { PracticeSession } from "@/lib/types";

type S = Pick<PracticeSession, "id" | "skillId" | "startedAt" | "durationMin" | "note" | "source">;

function session(overrides: Partial<S>): S {
  return {
    id: "s1",
    skillId: "skill-1",
    startedAt: Date.now(),
    durationMin: 10,
    note: null,
    source: "stopwatch",
    ...overrides,
  };
}

describe("summarizeLibreSessions", () => {
  it("returns an empty, hasAny=false summary with zero sessions", () => {
    const result = summarizeLibreSessions([], Date.now());
    expect(result.hasAny).toBe(false);
    expect(result.monthCount).toBe(0);
    expect(result.monthMinutes).toBe(0);
    expect(result.recent).toEqual([]);
  });

  it("ignores non-libre (non-stopwatch) sessions entirely", () => {
    const monthStart = new Date(2026, 9, 1).getTime();
    const sessions = [
      session({ id: "a", source: "timer", startedAt: new Date(2026, 9, 5).getTime(), durationMin: 30 }),
      session({ id: "b", source: "manual", startedAt: new Date(2026, 9, 5).getTime(), durationMin: 30 }),
    ];
    const result = summarizeLibreSessions(sessions, monthStart);
    expect(result.hasAny).toBe(false);
    expect(result.recent).toEqual([]);
  });

  it("carries the note field through for sessions that have one", () => {
    const monthStart = new Date(2026, 9, 1).getTime();
    const sessions = [session({ id: "a", startedAt: new Date(2026, 9, 5).getTime(), note: "Improvisar sobre un acorde" })];
    const result = summarizeLibreSessions(sessions, monthStart);
    expect(result.recent[0].note).toBe("Improvisar sobre un acorde");
  });

  it("leaves note as null for sessions saved without one", () => {
    const monthStart = new Date(2026, 9, 1).getTime();
    const sessions = [session({ id: "a", startedAt: new Date(2026, 9, 5).getTime(), note: null })];
    const result = summarizeLibreSessions(sessions, monthStart);
    expect(result.recent[0].note).toBeNull();
  });

  it("counts and sums minutes only for sessions within the month, while recent includes all-time sessions", () => {
    const monthStart = new Date(2026, 9, 1).getTime();
    const sessions = [
      session({ id: "this-month-1", startedAt: new Date(2026, 9, 5).getTime(), durationMin: 20 }),
      session({ id: "this-month-2", startedAt: new Date(2026, 9, 10).getTime(), durationMin: 15 }),
      session({ id: "last-month", startedAt: new Date(2026, 8, 20).getTime(), durationMin: 50 }),
    ];
    const result = summarizeLibreSessions(sessions, monthStart);
    expect(result.monthCount).toBe(2);
    expect(result.monthMinutes).toBe(35);
    expect(result.hasAny).toBe(true);
    expect(result.recent).toHaveLength(3);
  });

  it("carries a null skillId through untouched, for a genuinely skill-less libre session", () => {
    const monthStart = new Date(2026, 9, 1).getTime();
    const sessions = [session({ id: "a", skillId: null, startedAt: new Date(2026, 9, 5).getTime() })];
    const result = summarizeLibreSessions(sessions, monthStart);
    expect(result.recent[0].skillId).toBeNull();
    expect(result.hasAny).toBe(true);
    expect(result.monthCount).toBe(1);
  });

  it("sorts recent sessions newest first and respects the limit cap", () => {
    const monthStart = new Date(2026, 9, 1).getTime();
    const sessions = [
      session({ id: "oldest", startedAt: new Date(2026, 9, 1).getTime() }),
      session({ id: "newest", startedAt: new Date(2026, 9, 10).getTime() }),
      session({ id: "middle", startedAt: new Date(2026, 9, 5).getTime() }),
    ];
    const result = summarizeLibreSessions(sessions, monthStart, 2);
    expect(result.recent.map((s) => s.id)).toEqual(["newest", "middle"]);
  });
});
