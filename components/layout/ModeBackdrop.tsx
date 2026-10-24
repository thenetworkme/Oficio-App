/**
 * Full-viewport "Pomodoro" background fill for a page rendered inside
 * AppShell. AppShell's own <main> intentionally keeps the legacy `bg-paper`
 * background (see its file comment) rather than painting `--mode-bg`
 * itself — "a page that wants the full reference look sets --mode-bg ...
 * on its OWN root as it gets redesigned" is the documented escape hatch for
 * exactly this. AppShell's <main> is also centered at a 1360px max-width
 * with its own padding, so a page-local wrapper div can't bleed edge-to-edge
 * through it; a `position:fixed` layer behind everything sidesteps that
 * constraint cleanly without touching AppShell/TopNav (out of this phase's
 * scope) — same visual result (the whole viewport reads as the current mode
 * color), it just doesn't scroll with content, which is irrelevant for a
 * flat single-color fill.
 *
 * Defaults to the live `--mode-bg` (focus-red almost everywhere, per the
 * token contract) — pass `color` only for a page with a real reason to pin
 * a different shade.
 */
export function ModeBackdrop({ color = "var(--mode-bg)" }: { color?: string }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 transition-[background] duration-300"
      style={{ background: color }}
    />
  );
}
