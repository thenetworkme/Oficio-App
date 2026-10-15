import { describe, expect, it } from "vitest";
import { buildSkillDailyMinutes, heatmapDotColor, heatmapLevel } from "@/lib/heatmap";
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

describe("heatmapLevel", () => {
  it("is 0 for zero or negative minutes (no data)", () => {
    expect(heatmapLevel(0, 120)).toBe(0);
    expect(heatmapLevel(-5, 120)).toBe(0);
  });

  it("buckets ratio-of-scale into levels 1-4", () => {
    expect(heatmapLevel(10, 120)).toBe(1); // ratio ~0.08 < 0.2
    expect(heatmapLevel(30, 120)).toBe(2); // ratio 0.25 < 0.45
    expect(heatmapLevel(60, 120)).toBe(3); // ratio 0.5 < 0.75
    expect(heatmapLevel(120, 120)).toBe(4); // ratio 1 >= 0.75
  });
});

describe("heatmapDotColor", () => {
  it("returns the base color directly at level 0 (no data)", () => {
    expect(heatmapDotColor(0, "red", "blue")).toBe("blue");
  });

  it("mixes color into base at the level's opacity percentage for levels 1-4", () => {
    expect(heatmapDotColor(1, "red", "blue")).toBe("color-mix(in srgb, red 22%, blue)");
    expect(heatmapDotColor(2, "red", "blue")).toBe("color-mix(in srgb, red 45%, blue)");
    expect(heatmapDotColor(3, "red", "blue")).toBe("color-mix(in srgb, red 72%, blue)");
    expect(heatmapDotColor(4, "red", "blue")).toBe("color-mix(in srgb, red 100%, blue)");
  });

  it("works with CSS var() references, unresolved (color-mix resolves them at paint time)", () => {
    expect(heatmapDotColor(4, "var(--ink)", "var(--line)")).toBe("color-mix(in srgb, var(--ink) 100%, var(--line))");
  });
});
