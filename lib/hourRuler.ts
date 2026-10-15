// Pure tick-height/lit-level math behind components/ui/HourRuler.tsx — the
// "100-mark ruler" showing progress toward a hour goal (e.g. 10,000h).
// Lit-level logic is ported from design-reference/punto's PuntoPanel.dc.html
// `skills` builder (`ticks: Array.from({length:100}, (_, t) => ...)`).

export type TickLevel = 0 | 1 | 2; // 0 = dim/unlit, 1 = partial, 2 = full/lit

export interface Tick {
  /** 0-based tick index. */
  index: number;
  /** Lit level: 2 = fully lit, 1 = the single partially-lit transitional
   * tick, 0 = dim/unlit. */
  level: TickLevel;
  /** Tick bar height in px — every `majorEvery`-th tick (1-based) is taller
   * (a "major" mark), matching the reference's `(t+1) % 10 === 0 ? 34 : 20`. */
  height: number;
}

export interface BuildTicksOptions {
  tickCount?: number;
  majorEvery?: number;
  minorHeight?: number;
  majorHeight?: number;
}

/** currentHours/goalHours, clamped to [0, 1] — handles goalHours <= 0 and
 * out-of-range currentHours defensively instead of producing NaN/Infinity. */
export function progressFraction(currentHours: number, goalHours: number): number {
  if (!Number.isFinite(currentHours) || !Number.isFinite(goalHours) || goalHours <= 0) return 0;
  return Math.min(1, Math.max(0, currentHours / goalHours));
}

export function buildTicks(currentHours: number, goalHours: number, opts: BuildTicksOptions = {}): Tick[] {
  const { tickCount = 100, majorEvery = 10, minorHeight = 20, majorHeight = 34 } = opts;
  const fraction = progressFraction(currentHours, goalHours);
  const filled = fraction * tickCount;

  const ticks: Tick[] = [];
  for (let t = 0; t < tickCount; t++) {
    let level: TickLevel = 0;
    if (t + 1 <= Math.floor(filled)) level = 2;
    else if (t < filled) level = 1;
    const height = (t + 1) % majorEvery === 0 ? majorHeight : minorHeight;
    ticks.push({ index: t, level, height });
  }
  return ticks;
}

/** Evenly spaced labels under the ruler, e.g. goalHours=10000 -> [0, 2500,
 * 5000, 7500, 10000] (5 labels: 0%, 25%, 50%, 75%, 100% of goal). */
export function buildRulerLabels(goalHours: number, count = 5): number[] {
  if (!Number.isFinite(goalHours) || goalHours <= 0 || count < 2) return [0];
  const labels: number[] = [];
  for (let i = 0; i < count; i++) {
    labels.push(Math.round((goalHours * i) / (count - 1)));
  }
  return labels;
}
