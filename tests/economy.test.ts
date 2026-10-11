import { describe, expect, it } from "vitest";
import { coinsPerSession, levelForXp, levelProgress, xpForSession, XP_PER_LEVEL } from "@/lib/economy";

describe("coinsPerSession", () => {
  it("matches the mockup formula for a full 25-minute pomodoro with high focus", () => {
    // round(25/25*10) + (4>=4?5:0) = 10 + 5 = 15
    expect(coinsPerSession(25, 4)).toBe(15);
  });

  it("gives no focus bonus below quality 4", () => {
    expect(coinsPerSession(25, 3)).toBe(10);
  });

  it("treats a null quality (manual log, unrated) as not qualifying for the bonus", () => {
    expect(coinsPerSession(25, null)).toBe(10);
  });

  it("scales with duration", () => {
    expect(coinsPerSession(50, 5)).toBe(25); // round(50/25*10)=20 + 5
    expect(coinsPerSession(90, 2)).toBe(36); // round(90/25*10)=36 + 0
  });
});

describe("xpForSession", () => {
  it("matches the mockup formula", () => {
    // round(25*(0.8+4*0.1)) = round(25*1.2) = 30
    expect(xpForSession(25, 4)).toBe(30);
  });

  it("falls back to the base 0.8 multiplier when quality is null", () => {
    expect(xpForSession(25, null)).toBe(20); // round(25*0.8)
  });

  it("scales with duration and quality", () => {
    expect(xpForSession(50, 5)).toBe(65); // round(50*1.3)
  });
});

describe("levelForXp / levelProgress", () => {
  it("is level 1 at zero xp", () => {
    expect(levelForXp(0)).toBe(1);
  });

  it("advances a level every XP_PER_LEVEL xp", () => {
    expect(levelForXp(XP_PER_LEVEL - 1)).toBe(1);
    expect(levelForXp(XP_PER_LEVEL)).toBe(2);
    expect(levelForXp(XP_PER_LEVEL * 13)).toBe(14);
  });

  it("never returns a level below 1 for negative input", () => {
    expect(levelForXp(-50)).toBe(1);
  });

  it("reports progress within the current level", () => {
    const p = levelProgress(XP_PER_LEVEL * 13 + 600);
    expect(p.level).toBe(14);
    expect(p.xpIntoLevel).toBe(600);
    expect(p.xpForNext).toBe(XP_PER_LEVEL);
    expect(p.pct).toBe(25);
  });
});
