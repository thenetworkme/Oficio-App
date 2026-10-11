import { describe, expect, it } from "vitest";
import { computeBestStreak, computeCurrentStreak, needsStreakGuard } from "@/lib/streak";

describe("streak", () => {
  it("counts consecutive qualifying days ending today", () => {
    const daily = {
      "2026-10-08": 40,
      "2026-10-09": 35,
      "2026-10-10": 60,
    };
    expect(computeCurrentStreak(daily, 30, "2026-10-10")).toBe(3);
  });

  it("does not break the streak before today is over", () => {
    const daily = {
      "2026-10-08": 40,
      "2026-10-09": 35,
      "2026-10-10": 5, // today, not yet met
    };
    expect(computeCurrentStreak(daily, 30, "2026-10-10")).toBe(2);
  });

  it("breaks on a missed day", () => {
    const daily = {
      "2026-10-07": 40,
      "2026-10-09": 35,
      "2026-10-10": 60,
    };
    expect(computeCurrentStreak(daily, 30, "2026-10-10")).toBe(2);
  });

  it("returns 0 with no qualifying days", () => {
    expect(computeCurrentStreak({}, 30, "2026-10-10")).toBe(0);
  });

  it("finds the best streak anywhere in history", () => {
    const daily = {
      "2026-09-01": 40,
      "2026-09-02": 40,
      "2026-09-03": 40,
      "2026-09-05": 40,
      "2026-10-10": 5,
    };
    expect(computeBestStreak(daily, 30)).toBe(3);
  });

  it("flags when the streak guard reminder should fire", () => {
    expect(needsStreakGuard({ "2026-10-10": 10 }, 30, "2026-10-10")).toBe(true);
    expect(needsStreakGuard({ "2026-10-10": 30 }, 30, "2026-10-10")).toBe(false);
  });
});
