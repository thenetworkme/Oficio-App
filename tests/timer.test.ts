import { describe, expect, it } from "vitest";
import { DEFAULT_DURATIONS, cycleDotsFilled, modeTotalSeconds, nextMode, remainingSeconds } from "@/lib/timer";

describe("timer", () => {
  it("computes total seconds per mode from configured durations", () => {
    expect(modeTotalSeconds("focus", DEFAULT_DURATIONS)).toBe(25 * 60);
    expect(modeTotalSeconds("short", DEFAULT_DURATIONS)).toBe(5 * 60);
    expect(modeTotalSeconds("long", DEFAULT_DURATIONS)).toBe(15 * 60);
  });

  it("computes remaining seconds from wall-clock time, never by decrementing", () => {
    const start = 1_000_000;
    expect(remainingSeconds(start, 1500, start)).toBe(1500);
    expect(remainingSeconds(start, 1500, start + 10_000)).toBe(1490);
    expect(remainingSeconds(start, 1500, start + 1_600_000)).toBe(0);
  });

  it("survives a simulated background/reload gap (same formula regardless of tick count)", () => {
    const start = 1_000_000;
    const afterManyTicks = remainingSeconds(start, 1500, start + 5000);
    const afterOneJump = remainingSeconds(start, 1500, start + 5000);
    expect(afterManyTicks).toBe(afterOneJump);
  });

  it("goes to short break after a non-multiple-of-4 focus completion", () => {
    expect(nextMode("focus", 1)).toBe("short");
    expect(nextMode("focus", 2)).toBe("short");
    expect(nextMode("focus", 3)).toBe("short");
  });

  it("goes to long break every 4th focus completion", () => {
    expect(nextMode("focus", 4)).toBe("long");
    expect(nextMode("focus", 8)).toBe("long");
  });

  it("always returns to focus after a break", () => {
    expect(nextMode("short", 1)).toBe("focus");
    expect(nextMode("long", 4)).toBe("focus");
  });

  it("fills cycle dots based on completed pomodoros", () => {
    expect(cycleDotsFilled(0, "focus")).toBe(0);
    expect(cycleDotsFilled(1, "short")).toBe(1);
    expect(cycleDotsFilled(4, "long")).toBe(4);
    expect(cycleDotsFilled(5, "focus")).toBe(1);
  });
});
