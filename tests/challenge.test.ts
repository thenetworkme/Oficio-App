import { describe, expect, it } from "vitest";
import {
  computeChallengeStreak,
  computeDayStates,
  dateForDayNumber,
  dayNumberForDate,
  percentOfTenThousandHours,
  projectedEndDate,
  totalInvestedMin,
} from "@/lib/challenge";

describe("computeDayStates", () => {
  it("marks logged days done, the current day today, and the rest upcoming", () => {
    const { states, graceDaysUsed } = computeDayStates(5, 3, [
      { dayNumber: 1, durationMin: 30 },
      { dayNumber: 2, durationMin: 30 },
    ], 2);
    expect(states).toEqual(["done", "done", "today", "upcoming", "upcoming"]);
    expect(graceDaysUsed).toBe(0);
  });

  it("spends grace days on past unlogged days, in order, until the budget runs out", () => {
    const { states, graceDaysUsed } = computeDayStates(6, 6, [
      { dayNumber: 1, durationMin: 30 },
      { dayNumber: 4, durationMin: 30 },
    ], 2);
    // day2, day3 unlogged -> grace (budget 2); day5 unlogged -> budget exhausted -> missed; day6 is "today"
    expect(states).toEqual(["done", "grace", "grace", "done", "missed", "today"]);
    expect(graceDaysUsed).toBe(2);
  });

  it("treats a day with 0 logged minutes the same as not logged", () => {
    const { states } = computeDayStates(3, 2, [{ dayNumber: 1, durationMin: 0 }], 0);
    expect(states).toEqual(["missed", "today", "upcoming"]);
  });
});

describe("computeChallengeStreak", () => {
  it("counts a consecutive run of done/grace days ending at the last completed day", () => {
    const streak = computeChallengeStreak(["done", "grace", "done", "done", "today", "upcoming"]);
    expect(streak.current).toBe(4);
    expect(streak.best).toBe(4);
  });

  it("resets the current streak at a missed day but keeps the best streak from earlier", () => {
    const streak = computeChallengeStreak(["done", "done", "done", "missed", "done", "today"]);
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(3);
  });

  it("returns 0/0 for an all-upcoming challenge", () => {
    const streak = computeChallengeStreak(["today", "upcoming", "upcoming"]);
    expect(streak).toEqual({ current: 0, best: 0 });
  });

  it("does not let a missed day in the middle beat a longer later run", () => {
    const streak = computeChallengeStreak(["missed", "done", "done", "done", "done", "done"]);
    expect(streak.current).toBe(5);
    expect(streak.best).toBe(5);
  });
});

describe("totalInvestedMin", () => {
  it("sums only positive durations", () => {
    expect(totalInvestedMin([{ dayNumber: 1, durationMin: 30 }, { dayNumber: 2, durationMin: 0 }])).toBe(30);
  });
});

describe("date helpers", () => {
  it("dayNumberForDate / dateForDayNumber round-trip", () => {
    expect(dayNumberForDate("2026-09-30", "2026-10-11")).toBe(12);
    expect(dateForDayNumber("2026-09-30", 12)).toBe("2026-10-11");
  });

  it("projectedEndDate adds totalDays-1 days to the start", () => {
    expect(projectedEndDate("2026-10-11", 30)).toBe("2026-11-09");
  });
});

describe("percentOfTenThousandHours", () => {
  it("matches the mockup's 30 days x 30 min -> 0.15% example", () => {
    expect(percentOfTenThousandHours(30, 30)).toBeCloseTo(0.15, 2);
  });
});
