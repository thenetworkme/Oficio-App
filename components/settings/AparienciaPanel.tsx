"use client";

import { Check } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { DotDigits } from "@/components/ui/DotDigits";
import { useOficioTheme } from "@/lib/theme/ThemeProvider";
import { ACCENT_SWATCHES, THEMES, type ThemeId } from "@/lib/theme/tokens";

// Rebuilt against design-reference/punto/html/PuntoAjustes.dc.html's
// Apariencia tab: Tema chips (Oscuro/Claro/Sistema), Color de señal (5 ring-
// highlighted circular swatches) and a live "Vista previa" card showing the
// real dot-matrix digits + an "EMPEZAR" pill in the chosen combination.
// Wired directly to useOficioTheme() — see that hook for the persistence
// (profile.themeId/accentIdx) and no-flash boot logic this panel doesn't
// need to know about.

const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: "dark", label: "Oscuro" },
  { id: "light", label: "Claro" },
  { id: "system", label: "Sistema" },
];

export function AparienciaPanel() {
  const { themeId, mode, accentIdx, signal, setThemeId, setAccentIdx } = useOficioTheme();
  const theme = THEMES.find((t) => t.mode === mode) ?? THEMES[0];

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-9">
        <div className="flex flex-col gap-4">
          <h3 className="label-xs">Tema</h3>
          <div role="group" aria-label="Tema" className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((opt) => (
              <Chip key={opt.id} pressed={themeId === opt.id} onClick={() => setThemeId(opt.id)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="label-xs">Color de señal</h3>
          <div role="group" aria-label="Color de señal" className="flex flex-wrap gap-4">
            {ACCENT_SWATCHES.map(([name, hex], i) => {
              const selected = accentIdx === i;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  aria-label={name}
                  onClick={() => setAccentIdx(i)}
                  className="relative size-11 shrink-0 rounded-full border-0 p-0 transition-shadow"
                  style={{
                    background: hex,
                    boxShadow: selected ? `0 0 0 3px var(--paper), 0 0 0 5px ${hex}` : "none",
                  }}
                >
                  {selected && (
                    <Check
                      size={18}
                      aria-hidden="true"
                      className="absolute inset-0 m-auto"
                      style={{ color: "var(--ink-solid)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
        <h3 className="label-xs">Vista previa</h3>
        <div
          className="rounded-card border p-9"
          style={{ borderColor: theme.line, background: theme.paper }}
        >
          <DotDigits
            value="01:50"
            size={9}
            onColor={theme.ink}
            offColor={theme.line}
            signalColor={signal}
            running
            ariaLabel="01:50, vista previa del temporizador"
          />
          <div className="mt-8 flex items-center justify-between gap-3">
            <span className="label-xs" style={{ color: theme.muted }}>
              Programación · Foco
            </span>
            <span
              className="rounded-chip px-5 py-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em]"
              style={{ background: signal, color: "var(--ink-solid)" }}
            >
              Empezar
            </span>
          </div>
        </div>
        <p className="m-0 px-1 text-[13px] text-muted">
          Tu elección se guarda en tu cuenta y se aplica en todas tus pantallas.
        </p>
      </div>
    </div>
  );
}
