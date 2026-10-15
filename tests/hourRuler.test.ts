import { describe, expect, it } from "vitest";
import { buildRulerLabels, buildTicks, progressFraction } from "@/lib/hourRuler";

describe("progressFraction", () => {
  it("divides and clamps to [0, 1]", () => {
    expect(progressFraction(1284, 10_000)).toBeCloseTo(0.1284);
    expect(progressFraction(-5, 10_000)).toBe(0);
    expect(progressFraction(20_000, 10_000)).toBe(1);
  });

  it("is 0 when the goal is 0 or invalid, not NaN/Infinity", () => {
    expect(progressFraction(100, 0)).toBe(0);
    expect(progressFraction(100, -10)).toBe(0);
    expect(progressFraction(NaN, 10_000)).toBe(0);
  });
});

describe("buildTicks", () => {
  it("returns tickCount ticks", () => {
    expect(buildTicks(1284, 10_000)).toHaveLength(100);
    expect(buildTicks(0, 10_000, { tickCount: 20 })).toHaveLength(20);
  });

  it("1.284/10.000h (12.84 of 100 ticks): first 12 ticks fully lit, the 13th partial, the rest dim", () => {
    const ticks = buildTicks(1284, 10_000);
    for (let i = 0; i < 12; i++) expect(ticks[i].level).toBe(2);
    expect(ticks[12].level).toBe(1);
    for (let i = 13; i < 100; i++) expect(ticks[i].level).toBe(0);
  });

  it("0 hours: every tick dim", () => {
    const ticks = buildTicks(0, 10_000);
    expect(ticks.every((t) => t.level === 0)).toBe(true);
  });

  it("hours >= goal: every tick fully lit", () => {
    const ticks = buildTicks(10_000, 10_000);
    expect(ticks.every((t) => t.level === 2)).toBe(true);
    const over = buildTicks(50_000, 10_000);
    expect(over.every((t) => t.level === 2)).toBe(true);
  });

  it("exact multiple of the tick scale (e.g. 2500/10000 = 25 ticks) has no partial tick", () => {
    const ticks = buildTicks(2500, 10_000);
    for (let i = 0; i < 25; i++) expect(ticks[i].level).toBe(2);
    for (let i = 25; i < 100; i++) expect(ticks[i].level).toBe(0);
    expect(ticks.some((t) => t.level === 1)).toBe(false);
  });

  it("every 10th tick (1-based) is a taller 'major' mark", () => {
    const ticks = buildTicks(0, 10_000);
    expect(ticks[9].height).toBe(34); // 10th tick, index 9
    expect(ticks[19].height).toBe(34);
    expect(ticks[0].height).toBe(20);
    expect(ticks[8].height).toBe(20);
  });
});

describe("buildRulerLabels", () => {
  it("builds 5 evenly spaced labels for a 10,000h goal", () => {
    expect(buildRulerLabels(10_000)).toEqual([0, 2500, 5000, 7500, 10_000]);
  });

  it("supports a custom label count", () => {
    expect(buildRulerLabels(100, 3)).toEqual([0, 50, 100]);
  });
});
