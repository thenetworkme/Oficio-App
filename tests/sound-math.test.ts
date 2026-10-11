import { describe, expect, it } from "vitest";
import { dbToGain, noteFreq, scaledGain } from "@/lib/sound/math";

describe("sound math", () => {
  it("converts 0dB to unity gain", () => {
    expect(dbToGain(0)).toBeCloseTo(1, 5);
  });

  it("converts -20dB to a tenth of unity gain", () => {
    expect(dbToGain(-20)).toBeCloseTo(0.1, 5);
  });

  it("converts -6dB to roughly half gain", () => {
    expect(dbToGain(-6)).toBeCloseTo(0.5012, 3);
  });

  it("scales a base gain by a 0-1 volume knob", () => {
    expect(scaledGain(0.5, 1)).toBeCloseTo(0.5, 5);
    expect(scaledGain(0.5, 0)).toBe(0);
    expect(scaledGain(0.5, 0.5)).toBeCloseTo(0.25, 5);
  });

  it("clamps volume to the 0-1 range", () => {
    expect(scaledGain(0.5, 2)).toBeCloseTo(0.5, 5);
    expect(scaledGain(0.5, -1)).toBe(0);
  });

  it("computes A4 as 440Hz at zero semitones", () => {
    expect(noteFreq(0)).toBeCloseTo(440, 5);
  });

  it("computes an octave up/down as double/half frequency", () => {
    expect(noteFreq(12)).toBeCloseTo(880, 5);
    expect(noteFreq(-12)).toBeCloseTo(220, 5);
  });
});
