import { describe, expect, it } from "vitest";
import { buildDotGrid } from "@/lib/dotmatrix";

describe("buildDotGrid", () => {
  it("builds a 5-wide grid for a single digit, 7 rows tall", () => {
    const grid = buildDotGrid("0");
    expect(grid.columns).toBe(5);
    expect(grid.cells).toHaveLength(5 * 7);
    // '0' glyph: ['01110','10001','10011','10101','11001','10001','01110']
    // Row 0 ("01110"): columns 0 and 4 unlit, 1-3 lit.
    const row0 = grid.cells.slice(0, 5).map((c) => c.lit);
    expect(row0).toEqual([false, true, true, true, false]);
    // Row 6 (last, "01110" again) matches row 0.
    const row6 = grid.cells.slice(6 * 5, 6 * 5 + 5).map((c) => c.lit);
    expect(row6).toEqual(row0);
  });

  it("inserts exactly one blank gap column between characters, none at the edges", () => {
    // "25:00" -> 5 (2) + gap(1) + 5 (5) + gap(1) + 1 (:) + gap(1) + 5 (0) + gap(1) + 5 (0)
    //          = 5+1+5+1+1+1+5+1+5 = 25
    const grid = buildDotGrid("25:00");
    expect(grid.columns).toBe(25);
    expect(grid.cells).toHaveLength(25 * 7);
  });

  it("colon is 1 column wide with its two dots lit at rows 2 and 4 (glyph ['0','0','1','0','1','0','0'])", () => {
    const grid = buildDotGrid(":");
    expect(grid.columns).toBe(1);
    const litRows = [];
    for (let r = 0; r < 7; r++) {
      if (grid.cells[r].lit) litRows.push(r);
    }
    expect(litRows).toEqual([2, 4]);
    expect(grid.cells.every((c) => c.colon)).toBe(true);
  });

  it("marks every cell of a ':' character as colon, and no digit cell as colon", () => {
    const grid = buildDotGrid("1:2");
    // columns: 1(2 wide: "00100" etc -> width 5)+gap+":"(1)+gap+"2"(5) = 5+1+1+1+5 = 13
    expect(grid.columns).toBe(13);
    // Column index 6 (0-based: 0-4 "1", 5 gap, 6 ":") is the colon column.
    const colonColIdx = 6;
    for (let r = 0; r < 7; r++) {
      const cell = grid.cells[r * grid.columns + colonColIdx];
      expect(cell.colon).toBe(true);
    }
    // A digit column (e.g. col 0, part of "1") must never be marked colon.
    for (let r = 0; r < 7; r++) {
      const cell = grid.cells[r * grid.columns + 0];
      expect(cell.colon).toBe(false);
    }
  });

  it("renders '25:00' with the exact column count and shape the glyph table implies", () => {
    const grid = buildDotGrid("25:00");
    expect(grid.columns).toBe(25);
    // '2' glyph row 0 = "01110" -> columns 0-4.
    const row0 = grid.cells.slice(0, 5).map((c) => c.lit);
    expect(row0).toEqual([false, true, true, true, false]);
    // gap column (index 5) is fully unlit across every row.
    for (let r = 0; r < 7; r++) {
      expect(grid.cells[r * 25 + 5].lit).toBe(false);
    }
  });

  it("renders '08:40' with the glyph table's expected column count", () => {
    // 0(5)+gap+8(5)+gap+:(1)+gap+4(5)+gap+0(5) = 5+1+5+1+1+1+5+1+5 = 25
    const grid = buildDotGrid("08:40");
    expect(grid.columns).toBe(25);
  });

  it("supports '.' as a 1-wide glyph (thousands-grouped hour counts, e.g. '1.284')", () => {
    const grid = buildDotGrid("1.284");
    // 1(5)+gap+.(1)+gap+2(5)+gap+8(5)+gap+4(5) = 5+1+1+1+5+1+5+1+5 = 25
    expect(grid.columns).toBe(25);
  });

  it("renders an unsupported character as a blank 3-column gap instead of throwing", () => {
    expect(() => buildDotGrid("1x2")).not.toThrow();
    const grid = buildDotGrid("1x2");
    // 1(5)+gap+x(3 blank)+gap+2(5) = 5+1+3+1+5 = 15
    expect(grid.columns).toBe(15);
    const xStart = 6; // after "1"(5) + gap(1)
    for (let r = 0; r < 7; r++) {
      for (let c = xStart; c < xStart + 3; c++) {
        expect(grid.cells[r * 15 + c].lit).toBe(false);
      }
    }
  });
});
