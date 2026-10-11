import { describe, expect, it } from "vitest";
import { buildSkillDailyMinutes } from "@/lib/heatmap";
import type { PracticeSession } from "@/lib/types";

function makeSession(skillId: string, startedAt: number, durationMin: number): PracticeSession {
  return {
    id: `s_${startedAt}`,
    userId: "u1",
    skillId,
    startedAt,
    durationMin,
    quality: null,
    note: null,
    pomodoros: 0,
    source: "manual",
    createdAt: startedAt,
  };
}

describe("buildSkillDailyMinutes", () => {
  it("sums minutes per local calendar day, keyed yyyy-MM-dd", () => {
    // Two sessions the same UTC day, same skill.
    const d1 = Date.UTC(2026, 9, 12, 10, 0); // 2026-10-12T10:00Z
    const d2 = Date.UTC(2026, 9, 12, 20, 0); // 2026-10-12T20:00Z
    const sessions = [makeSession("sk1", d1, 30), makeSession("sk1", d2, 45)];
    const map = buildSkillDailyMinutes(sessions, "sk1", "UTC");
    expect(map["2026-10-12"]).toBe(75);
  });

  it("only includes sessions for the requested skill", () => {
    const d = Date.UTC(2026, 9, 12, 12, 0);
    const sessions = [makeSession("sk1", d, 30), makeSession("sk2", d, 999)];
    const map = buildSkillDailyMinutes(sessions, "sk1", "UTC");
    expect(map["2026-10-12"]).toBe(30);
    expect(Object.keys(map)).toEqual(["2026-10-12"]);
  });

  it("buckets by the LOCAL calendar day in the given timezone, not the UTC day", () => {
    // 2026-10-13T02:00:00Z is still 2026-10-12 local in a UTC-4 timezone
    // (America/Santo_Domingo has no DST, fixed UTC-4 year-round).
    const lateNightUtc = Date.UTC(2026, 9, 13, 2, 0); // Oct 13, 02:00 UTC
    const sessions = [makeSession("sk1", lateNightUtc, 40)];

    const localMap = buildSkillDailyMinutes(sessions, "sk1", "America/Santo_Domingo");
    expect(localMap["2026-10-12"]).toBe(40);
    expect(localMap["2026-10-13"]).toBeUndefined();

    // Sanity check: the same instant buckets to the *next* day in UTC,
    // proving the timezone argument actually changes the bucketing and this
    // isn't accidentally UTC-shifted.
    const utcMap = buildSkillDailyMinutes(sessions, "sk1", "UTC");
    expect(utcMap["2026-10-13"]).toBe(40);
  });

  it("returns an empty map when there are no sessions for the skill", () => {
    expect(buildSkillDailyMinutes([], "sk1", "UTC")).toEqual({});
  });
});
