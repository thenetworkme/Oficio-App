import { describe, expect, it } from "vitest";
import { isMilestoneReached, milestonesCrossed, nextMilestone, reachedMilestones } from "@/lib/milestones";

describe("milestones", () => {
  it("reaches a milestone once total hours meets or exceeds it", () => {
    expect(isMilestoneReached(100, 100)).toBe(true);
    expect(isMilestoneReached(99.9, 100)).toBe(false);
    expect(isMilestoneReached(150, 100)).toBe(true);
  });

  it("finds the next unreached milestone", () => {
    expect(nextMilestone(0)).toBe(1);
    expect(nextMilestone(1284)).toBe(5000);
    expect(nextMilestone(10000)).toBeNull();
    expect(nextMilestone(999999)).toBeNull();
  });

  it("lists every reached milestone", () => {
    expect(reachedMilestones(150)).toEqual([1, 10, 100]);
    expect(reachedMilestones(0.5)).toEqual([]);
  });

  it("detects milestones crossed between a before/after pair", () => {
    expect(milestonesCrossed(9.5, 10.5)).toEqual([10]);
    expect(milestonesCrossed(0, 10000)).toEqual([1, 10, 100, 500, 1000, 5000, 10000]);
    expect(milestonesCrossed(10, 10)).toEqual([]);
    expect(milestonesCrossed(500, 500)).toEqual([]);
    expect(milestonesCrossed(499, 1200)).toEqual([500, 1000]);
  });
});
