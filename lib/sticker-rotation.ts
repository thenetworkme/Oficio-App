// Deterministic per-element sticker rotation (-2deg..2deg), derived from a
// string/number id/index rather than re-randomized on every render — so
// cards don't jitter on re-render, per the Pegatina design system.
export function stickerRotation(seed: string | number): number {
  const s = String(seed);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 400) / 100; // 0..4
  return Math.round((normalized - 2) * 10) / 10; // -2..2, one decimal
}

export function stickerRotationDeg(seed: string | number): string {
  return `${stickerRotation(seed)}deg`;
}
