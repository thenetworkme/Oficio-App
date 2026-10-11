import { describe, expect, it } from "vitest";
import { formatProjection, hoursPerWeek, projectTimeRemaining } from "@/lib/projection";

describe("projection", () => {
  it("computes weekly hours from minutes/day and days/week", () => {
    expect(hoursPerWeek(120, 6)).toBe(12);
    expect(hoursPerWeek(30, 7)).toBeCloseTo(3.5, 5);
  });

  it("shows weeks when under 9 weeks away", () => {
    const p = projectTimeRemaining(8, 1);
    expect(p.unit).toBe("weeks");
    expect(p.value).toBe(8);
  });

  it("shows months when under 24 months away", () => {
    const p = projectTimeRemaining(100, 5); // 20 weeks ~ 4.6 months
    expect(p.unit).toBe("months");
    expect(p.value).toBe(5);
  });

  it("shows years with one decimal under 10 years", () => {
    const p = projectTimeRemaining(3716, 15); // ~247.7 weeks ~ 4.75 years
    expect(p.unit).toBe("years");
    expect(p.value).toBeCloseTo(4.7, 1);
  });

  it("shows whole years from 10 years up", () => {
    const p = projectTimeRemaining(8716, 15); // ~581 weeks ~ 11.1 years
    expect(p.unit).toBe("years");
    expect(Number.isInteger(p.value)).toBe(true);
  });

  it("flags the goal as already reached", () => {
    const p = projectTimeRemaining(0, 10);
    expect(p.reached).toBe(true);
    expect(formatProjection(p)).toBe("Meta alcanzada");
  });

  it("formats with Spanish decimal comma for years", () => {
    const p = projectTimeRemaining(3716, 15);
    expect(formatProjection(p)).toMatch(/≈ \d+,\d años/);
  });
});
