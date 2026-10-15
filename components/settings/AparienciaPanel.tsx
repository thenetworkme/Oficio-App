"use client";

import { useMemo } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useOficioTheme } from "@/lib/theme/ThemeProvider";
import { ACCENT_SWATCHES, THEMES, type ThemeDef } from "@/lib/theme/tokens";
import { cn } from "@/lib/cn";

// NOTE: this panel's full UI is redesigned in a later phase against the new
// Punto primitives (components/ui/*) — this is a light-touch fix to keep it
// compiling and reasonably coherent under the new 2-palette + single-signal
// token model, not a redesign. In particular the old per-theme a1/a2/a3
// swatch trio is gone (ThemeDef no longer carries it) since there's now only
// ONE signal color shared across both palettes, so the 3-dot theme preview
// is dropped in favor of just the theme name.
function ThemeCard({ theme, selected, onPick }: { theme: ThemeDef; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className="flex flex-col gap-3 rounded-card border p-4 text-left transition-colors"
      style={{
        borderColor: selected ? "var(--signal)" : theme.line,
        background: theme.paper,
        color: theme.ink,
      }}
    >
      <span className="flex items-center justify-between text-[18px] font-medium">
        {theme.name} {selected && "✓"}
      </span>
    </button>
  );
}

export function AparienciaPanel() {
  const { themeId, mode, accentIdx, signal, setThemeId, setAccentIdx } = useOficioTheme();
  const theme = THEMES.find((t) => t.mode === mode) ?? THEMES[0];
  const followSystem = themeId === "system";
  const a1 = signal;

  const bars = useMemo(() => {
    const vals = [140, 95, 185, 120, 210, 155, 0];
    return vals.map((v, i) => ({ h: Math.max(3, Math.round((v / 210) * 64)), isToday: i === 5 }));
  }, []);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h3 className="label-xs">Tema</h3>
          <div role="group" aria-label="Tema" className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-5">
            {THEMES.map((t) => (
              <ThemeCard key={t.id} theme={t} selected={!followSystem && themeId === t.id} onPick={() => setThemeId(t.id)} />
            ))}
            <button
              type="button"
              aria-pressed={followSystem}
              onClick={() => setThemeId("system")}
              className="flex flex-col gap-3 rounded-card border p-4 text-left transition-colors"
              style={{ borderColor: followSystem ? "var(--signal)" : "var(--line)" }}
            >
              <span className="flex items-center justify-between text-[18px] font-medium">
                Sistema {followSystem && "✓"}
              </span>
            </button>
          </div>
        </div>

        <Card className="flex flex-col gap-4 p-6">
          <CardHeading>Color de señal</CardHeading>
          <div role="group" aria-label="Color de señal" className="flex flex-wrap gap-3">
            {ACCENT_SWATCHES.map(([name, hex], i) => (
              <button
                key={name}
                type="button"
                aria-pressed={accentIdx === i}
                aria-label={name}
                onClick={() => setAccentIdx(i)}
                className="size-12 rounded-full border p-0 transition-colors"
                style={{ background: hex, borderColor: accentIdx === i ? hex : "var(--border)" }}
              />
            ))}
          </div>
        </Card>
      </div>

      <aside aria-label="Vista previa" className="flex min-w-0 flex-[2_1_340px] flex-col gap-4 rounded-card border border-line p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardHeading>Vista previa</CardHeading>
          <span className="label-xs">{theme.name}</span>
        </div>
        <div className="flex flex-col gap-3.5 rounded-card p-4 text-ink-solid" style={{ background: a1 }}>
          <div className="text-[40px] font-medium leading-none tracking-tight">12 días</div>
          <span className="label-xs !text-ink-solid opacity-80">seguidos</span>
        </div>
        <div className="flex gap-2.5">
          <span className="flex-1 rounded-chip border border-border px-3 py-2.5 text-center font-mono text-[12px] uppercase tracking-[0.1em] text-muted">
            Inglés
          </span>
          <span className="flex-1 rounded-chip border border-border px-3 py-2.5 text-center font-mono text-[12px] uppercase tracking-[0.1em] text-muted">
            Guitarra
          </span>
        </div>
        <ProgressBar pct={13} color={a1} ariaLabel="Vista previa" height={10} />
        <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
          {bars.map((b, i) => (
            <span key={i} className={cn("block flex-1 rounded-t")} style={{ height: b.h, background: b.isToday ? a1 : "var(--line)" }} />
          ))}
        </div>
        <p className="m-0 text-[13px] text-muted">Tu elección se guarda en tu cuenta y se aplica en todas tus pantallas.</p>
      </aside>
    </div>
  );
}
