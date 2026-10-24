"use client";

import { Chip } from "@/components/ui/chip";
import { useOficioTheme } from "@/lib/theme/ThemeProvider";
import { MODE_COLORS, type ThemeId } from "@/lib/theme/tokens";

// Rebuilt against design-reference/pomodoro/html/PomoAjustes.dc.html's
// "Color" row: three small swatches showing the fixed mode colors (foco
// rojo / descanso corto verde azulado / descanso largo azul), with NO
// click handler in the reference markup — a static display, not a picker.
//
// This replaces the old "Punto"-era interactive 5-swatch --signal accent
// picker (ACCENT_SWATCHES/accentIdx/setAccentIdx) that used to live here.
// Per this phase's explicit instructions: useOficioTheme()/lib/theme/
// tokens.ts are NOT touched (still exported, still functional for any
// other not-yet-migrated screen that reads them) — only THIS panel's UI
// stops offering the interactive picker. Dark/light/system theme
// switching is real and stays fully wired below (Tema chips), so it's
// still reachable from Ajustes exactly as before.
const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: "dark", label: "Oscuro" },
  { id: "light", label: "Claro" },
  { id: "system", label: "Sistema" },
];

const MODE_SWATCHES: { id: keyof typeof MODE_COLORS; name: string }[] = [
  { id: "focus", name: "Foco" },
  { id: "short", name: "Descanso corto" },
  { id: "long", name: "Descanso largo" },
];

export function AparienciaPanel() {
  const { themeId, setThemeId } = useOficioTheme();

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-4">
        <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-card-solid-muted">Tema</h3>
        <div role="group" aria-label="Tema" className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => (
            <Chip
              key={opt.id}
              pressed={themeId === opt.id}
              onClick={() => setThemeId(opt.id)}
              className="ring-1 ring-inset ring-card-solid-line"
            >
              {opt.label}
            </Chip>
          ))}
        </div>
        <p className="m-0 text-sm text-card-solid-muted">Claro, oscuro, o según tu sistema operativo.</p>
      </section>

      <section className="flex flex-col gap-4 border-t border-card-solid-line pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-card-solid-muted">Color</h3>
          <div aria-hidden="true" className="flex gap-2">
            {MODE_SWATCHES.map((s) => (
              <span
                key={s.id}
                title={s.name}
                className="size-7 rounded-button"
                style={{ background: MODE_COLORS[s.id] }}
              />
            ))}
          </div>
        </div>
        <p className="m-0 text-sm text-card-solid-muted">
          Cada fase del Pomodoro tiene su propio color — foco, descanso corto y descanso largo. No es personalizable.
        </p>
      </section>
    </div>
  );
}
