/**
 * Pure, unit-testable math used by the Web Audio sound engine. Kept separate
 * from lib/sound/engine.ts and lib/sound/ambient.ts (which touch
 * AudioContext/AudioNode and can't be meaningfully unit tested in jsdom —
 * there's no real audio backend) so this boundary stays thin and the actual
 * math is verifiable.
 */

/** Converts a decibel value (negative = quieter, 0 = unity) to a linear gain multiplier. */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/** Clamps a 0-1 volume knob and applies it as a linear multiplier on top of a base gain. */
export function scaledGain(baseGain: number, volume01: number): number {
  const v = Math.min(1, Math.max(0, volume01));
  return baseGain * v;
}

/** Equal-tempered note frequency, `semitonesFromA4` steps away from A4 (440Hz). */
export function noteFreq(semitonesFromA4: number): number {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}
