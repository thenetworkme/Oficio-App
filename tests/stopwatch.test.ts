import { describe, expect, it } from "vitest";
import {
  canSaveElapsedMs,
  elapsedMs,
  formatStopwatchClock,
  minutesFromElapsedMs,
  MIN_STOPWATCH_MS,
} from "@/lib/stopwatch";

describe("elapsedMs", () => {
  it("returns accumulatedMs as-is when there is no running segment (startedAtMs null)", () => {
    expect(elapsedMs(null, 12_345, 999_999)).toBe(12_345);
  });

  it("adds elapsed wall-clock time on top of what was already banked", () => {
    const startedAt = 1_000_000;
    const now = startedAt + 90_000; // 90s running
    expect(elapsedMs(startedAt, 30_000, now)).toBe(30_000 + 90_000);
  });

  it("never goes negative if now is somehow before startedAt", () => {
    expect(elapsedMs(1_000, 500, 900)).toBe(500);
  });
});

describe("minutesFromElapsedMs (rounding, not flooring)", () => {
  it("rounds 29.6 minutes up to 30, not down to 29", () => {
    expect(minutesFromElapsedMs(29.6 * 60_000)).toBe(30);
  });

  it("rounds 29.4 minutes down to 29", () => {
    expect(minutesFromElapsedMs(29.4 * 60_000)).toBe(29);
  });

  it("rounds exactly 1 minute to 1", () => {
    expect(minutesFromElapsedMs(60_000)).toBe(1);
  });

  it("rounds a little under 1.5 min down, and 1.5 min exactly up (round-half-up)", () => {
    expect(minutesFromElapsedMs(89_000)).toBe(1); // 1.483 min
    expect(minutesFromElapsedMs(90_000)).toBe(2); // 1.5 min
  });
});

describe("canSaveElapsedMs (minimum loggable duration)", () => {
  it("rejects a session just under the 1-minute minimum", () => {
    expect(canSaveElapsedMs(MIN_STOPWATCH_MS - 1)).toBe(false);
    expect(canSaveElapsedMs(59_000)).toBe(false);
  });

  it("accepts a session right at the 1-minute minimum", () => {
    expect(canSaveElapsedMs(MIN_STOPWATCH_MS)).toBe(true);
    expect(canSaveElapsedMs(60_000)).toBe(true);
  });

  it("accepts a session comfortably above the minimum", () => {
    expect(canSaveElapsedMs(5 * 60_000)).toBe(true);
  });
});

describe("formatStopwatchClock", () => {
  it("formats under an hour as MM:SS", () => {
    expect(formatStopwatchClock(0)).toBe("00:00");
    expect(formatStopwatchClock(65_000)).toBe("01:05");
    expect(formatStopwatchClock(59 * 60_000 + 59_000)).toBe("59:59");
  });

  it("formats an hour or more as H:MM:SS", () => {
    expect(formatStopwatchClock(60 * 60_000)).toBe("1:00:00");
    expect(formatStopwatchClock(90 * 60_000 + 5_000)).toBe("1:30:05");
  });
});
