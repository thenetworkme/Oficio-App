import { describe, expect, it } from "vitest";
import { formatDateEs, formatDecimal, formatInt, formatMinutes, formatPercent } from "@/lib/format";

describe("format", () => {
  it("formats thousands with a dot", () => {
    expect(formatInt(1284)).toBe("1.284");
    expect(formatInt(96)).toBe("96");
  });

  it("formats decimals with a comma", () => {
    expect(formatDecimal(12.84)).toBe("12,8");
    expect(formatDecimal(10)).toBe("10");
  });

  it("formats percentages", () => {
    expect(formatPercent(12.84)).toBe("12,8 %");
  });

  it("formats minutes as hXXmYY", () => {
    expect(formatMinutes(95)).toBe("1h 35m");
    expect(formatMinutes(40)).toBe("40m");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(0)).toBe("0m");
  });

  it("formats dates in Spanish", () => {
    expect(formatDateEs(new Date(2026, 3, 22))).toBe("22 de abril de 2026");
  });
});
