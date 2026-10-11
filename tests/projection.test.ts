import { describe, expect, it } from "vitest";
import {
  formatProjection,
  hoursPerWeek,
  projectTimeRemaining,
  projectTenThousandHours,
  recentWeeklyPace,
} from "@/lib/projection";
import type { PracticeSession } from "@/lib/types";

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

describe("recentWeeklyPace", () => {
  it("averages minutes over the trailing window into hours/week", () => {
    const now = Date.now();
    const sessions = [
      makeSession("sk1", now - 1 * 24 * 60 * 60 * 1000, 60), // 1h, 1 day ago
      makeSession("sk1", now - 10 * 24 * 60 * 60 * 1000, 60), // 1h, 10 days ago
      makeSession("sk2", now - 1 * 24 * 60 * 60 * 1000, 600), // different skill, ignored
    ];
    // 2h logged over a 90-day window (12.857 weeks) ~ 0.1556 h/week
    expect(recentWeeklyPace(sessions, "sk1", 90)).toBeCloseTo(2 / (90 / 7), 5);
  });

  it("ignores sessions outside the window", () => {
    const now = Date.now();
    const sessions = [makeSession("sk1", now - 200 * 24 * 60 * 60 * 1000, 600)];
    expect(recentWeeklyPace(sessions, "sk1", 90)).toBe(0);
  });

  it("returns 0 when the skill has no sessions at all", () => {
    expect(recentWeeklyPace([], "sk1", 90)).toBe(0);
  });
});

describe("projectTenThousandHours", () => {
  it("shows a congratulatory message once past 10,000 hours, with no division math", () => {
    const p = projectTenThousandHours(10500, 0);
    expect(p.status).toBe("reached");
    expect(p.message).toMatch(/10,000 horas/);
    expect(p.message).not.toMatch(/Infinity|NaN/i);
  });

  it("is also 'reached' exactly at 10,000 hours", () => {
    expect(projectTenThousandHours(10000, 5).status).toBe("reached");
  });

  it("shows an actionable message instead of Infinity/NaN when the recent pace is zero", () => {
    const p = projectTenThousandHours(100, 0);
    expect(p.status).toBe("no_pace");
    expect(p.message).toBe("Agrega más sesiones para ver una proyección.");
    expect(p.message).not.toMatch(/Infinity|NaN/i);
  });

  it("treats a near-zero pace (a stray minute over 90 days) the same as zero", () => {
    const p = projectTenThousandHours(100, 0.001);
    expect(p.status).toBe("no_pace");
  });

  it("produces a sane, natural-language projection for a normal pace", () => {
    // 9900h remaining at 15h/week ~ 660 weeks ~ 12.65 years -> years + months
    const p = projectTenThousandHours(100, 15);
    expect(p.status).toBe("projected");
    expect(p.message).toMatch(/^A este ritmo, llegarás a las 10,000 horas en \d+ años( y \d+ mes(es)?)?\.$/);
  });

  it("uses week granularity for a short remaining time, never a decimal", () => {
    // 10h remaining at 10h/week = 1 week
    const p = projectTenThousandHours(9990, 10);
    expect(p.message).toBe("A este ritmo, llegarás a las 10,000 horas en 1 semana.");
  });

  it("uses month granularity for a medium remaining time", () => {
    // 100h remaining at 12.5h/week ~ 8 weeks ~ 1.84 months -> still weeks threshold; pick a case landing in months
    const p = projectTenThousandHours(9900, 5); // 100h / 5h/week = 20 weeks ~ 4.6 months
    expect(p.status).toBe("projected");
    expect(p.message).toMatch(/en \d+ mes(es)?\./);
  });
});
