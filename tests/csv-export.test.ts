import { describe, expect, it } from "vitest";
import { sessionsCsv } from "@/lib/csv-export";
import type { PracticeSession } from "@/lib/types";

function session(overrides: Partial<PracticeSession>): PracticeSession {
  return {
    id: "s1",
    userId: "u1",
    skillId: "skill-1",
    startedAt: new Date(2026, 9, 5, 10, 0).getTime(),
    durationMin: 20,
    quality: 4,
    note: null,
    pomodoros: 0,
    source: "manual",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("sessionsCsv", () => {
  it("resolves a real skillId to the skill's name", () => {
    const skillNameById = new Map([["skill-1", "Guitarra"]]);
    const csv = sessionsCsv([session({ skillId: "skill-1" })], skillNameById);
    const [, row] = csv.split("\n");
    expect(row.split(",")[1]).toBe("Guitarra");
  });

  it("falls back to the skill id itself if the skill isn't found in the map", () => {
    const csv = sessionsCsv([session({ skillId: "unknown-skill" })], new Map());
    const [, row] = csv.split("\n");
    expect(row.split(",")[1]).toBe("unknown-skill");
  });

  it("exports a skill-less (skillId: null) 'Sesión libre' row with sensible fallback text, not null/undefined", () => {
    const csv = sessionsCsv([session({ skillId: null, source: "stopwatch" })], new Map());
    const [, row] = csv.split("\n");
    const cells = row.split(",");
    expect(cells[1]).toBe("General");
    expect(cells[1]).not.toBe("null");
    expect(cells[1]).not.toBe("undefined");
    expect(cells[1]).not.toBe("");
  });
});
