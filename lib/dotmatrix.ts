// Pure 5x7 bitmap dot-matrix font logic behind components/ui/DotDigits.tsx.
// Glyph bitmaps are copied VERBATIM from design-reference/punto's `dm()`
// method (design-reference/punto/html/PuntoPanel.dc.html) — do not
// re-derive them from screenshots, they must match exactly.
//
// Each glyph is 7 rows tall; each row-string's characters are columns
// (digits are 5 columns wide, ':' is 1 column wide). '1' = lit, '0' = unlit.
// A gap column (all-unlit) is inserted between consecutive characters.
//
// '.' is NOT part of the original reference glyph table (the reference only
// ever feeds `dm()` clock-style strings like "01:50"/"25:00"). This app also
// needs to render thousands-grouped hour counts in the same dot-matrix style
// (e.g. "1.284", per the Habilidad detail screen), so a 1-column-wide period
// glyph — a single lit dot on the baseline row, mirroring how narrow ':' is —
// is added here as a deliberate, documented extension.
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  // Extension (not in the reference table) — see comment above.
  ".": ["0", "0", "0", "0", "0", "0", "1"],
};

/** Glyph used for a character that isn't in GLYPHS, so an unexpected
 * character (e.g. a later-phase typo) renders as a blank gap instead of
 * crashing. */
const BLANK_GLYPH = ["000", "000", "000", "000", "000", "000", "000"];

export interface DotCell {
  /** Whether this dot is lit. */
  lit: boolean;
  /** Whether this dot belongs to a ':' glyph (rendered in the signal color,
   * and optionally blinking) rather than plain text color. */
  colon: boolean;
}

export interface DotGrid {
  /** Total column count, including the 1 blank gap column inserted between
   * every pair of consecutive characters. Always 7 rows tall. */
  columns: number;
  /** Row-major flat list of cells, length === columns * 7. */
  cells: DotCell[];
}

/** Builds the dot grid for a value string, exactly per the reference's
 * column-building loop (one gap column between characters, none at the
 * start/end). Unsupported characters render as a blank 3-column gap rather
 * than throwing. */
export function buildDotGrid(value: string): DotGrid {
  const chars = value.split("");
  const cols: { colon: boolean; rows: boolean[] }[] = [];

  chars.forEach((ch, i) => {
    const glyph = GLYPHS[ch] ?? BLANK_GLYPH;
    const width = glyph[0].length;
    for (let c = 0; c < width; c++) {
      cols.push({ colon: ch === ":", rows: glyph.map((row) => row[c] === "1") });
    }
    if (i < chars.length - 1) {
      cols.push({ colon: false, rows: Array(7).fill(false) });
    }
  });

  const cells: DotCell[] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < cols.length; c++) {
      cells.push({ lit: cols[c].rows[r], colon: cols[c].colon });
    }
  }

  return { columns: cols.length, cells };
}
