import { describe, expect, it } from "vitest";
import { DEFAULT_MODE_ID, MODE_COLORS, resolveModeColor } from "@/lib/theme/tokens";

describe("MODE_COLORS / resolveModeColor", () => {
  it("has the 3 fixed Pomodoro session colors from the design reference", () => {
    expect(MODE_COLORS.focus).toBe("#BA4949");
    expect(MODE_COLORS.short).toBe("#38858A");
    expect(MODE_COLORS.long).toBe("#397097");
  });

  it("defaults to focus", () => {
    expect(DEFAULT_MODE_ID).toBe("focus");
  });

  it("resolves a valid mode id to its color", () => {
    expect(resolveModeColor("focus")).toBe(MODE_COLORS.focus);
    expect(resolveModeColor("short")).toBe(MODE_COLORS.short);
    expect(resolveModeColor("long")).toBe(MODE_COLORS.long);
  });

  it("falls back to the focus color for null/undefined/unknown input", () => {
    expect(resolveModeColor(null)).toBe(MODE_COLORS.focus);
    expect(resolveModeColor(undefined)).toBe(MODE_COLORS.focus);
    expect(resolveModeColor("not-a-mode")).toBe(MODE_COLORS.focus);
    expect(resolveModeColor("")).toBe(MODE_COLORS.focus);
  });
});
