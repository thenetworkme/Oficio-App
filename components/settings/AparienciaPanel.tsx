"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Switch } from "@/components/ui/switch";
import { useOficioTheme } from "@/lib/theme/ThemeProvider";
import { THEMES, getTheme, resolveAccents, type ThemeDef } from "@/lib/theme/tokens";
import { cn } from "@/lib/cn";

function ThemeCard({ theme, selected, onPick }: { theme: ThemeDef; selected: boolean; onPick: () => void }) {
  const accent = theme.accents[0][1];
  const a2 = theme.accents[1]?.[1] ?? accent;
  const a3 = theme.accents[2]?.[1] ?? a2;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border-2 bg-card text-left text-text",
        selected ? "border-accent" : "border-line",
      )}
    >
      <span className="block h-[92px] box-border p-3" style={{ background: theme.bg }}>
        <span
          className="flex h-full flex-col gap-1.5 box-border rounded-lg border p-2"
          style={{ background: theme.card, borderColor: theme.line }}
        >
          <span className="block h-1.5 w-[55%] rounded-sm" style={{ background: theme.text }} />
          <span className="block h-1.5 w-[80%] rounded-sm" style={{ background: accent }} />
          <span className="mt-auto flex gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: accent }} />
            <span className="size-2.5 rounded-full" style={{ background: a2 }} />
            <span className="size-2.5 rounded-full" style={{ background: a3 }} />
          </span>
        </span>
      </span>
      <span className="flex min-h-11 items-center justify-between gap-2 px-3.5 py-3">
        <span className="flex flex-col">
          <span className="font-semibold">{theme.name}</span>
          <span className="text-xs text-muted">{theme.mode === "light" ? "Claro" : "Oscuro"}</span>
        </span>
        {selected && <Check size={20} className="text-accent" aria-hidden="true" />}
      </span>
    </button>
  );
}

export function AparienciaPanel() {
  const { themeId, accentIdx, followSystem, setTheme, setAccentIdx, setFollowSystem } = useOficioTheme();
  const theme = getTheme(themeId);
  const { accent } = resolveAccents(theme, accentIdx);

  const catppuccin = THEMES.filter((t) => t.group === "catppuccin");
  const others = THEMES.filter((t) => t.group === "otros");

  const bars = useMemo(() => {
    const vals = [140, 95, 185, 120, 210, 155, 0];
    return vals.map((v, i) => ({ h: Math.max(3, Math.round((v / 210) * 64)), isToday: i === 5 }));
  }, []);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
        <Card className="flex flex-col gap-6 p-6">
          <CardHeading id="h-theme">Tema</CardHeading>

          <div className="flex flex-col gap-3">
            <h3 className="label-xs font-semibold">Catppuccin</h3>
            <div role="group" aria-label="Temas Catppuccin" className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-3">
              {catppuccin.map((t) => (
                <ThemeCard key={t.id} theme={t} selected={t.id === themeId} onPick={() => setTheme(t.id, 0)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="label-xs font-semibold">Otros temas</h3>
            <div role="group" aria-label="Otros temas" className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-3">
              {others.map((t) => (
                <ThemeCard key={t.id} theme={t} selected={t.id === themeId} onPick={() => setTheme(t.id, 0)} />
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <CardHeading id="h-accent">Color de acento</CardHeading>
            <span className="text-sm text-muted">
              Se aplica a botones, progreso y gráficos. Las otras habilidades toman los colores siguientes de la
              paleta.
            </span>
          </div>
          <div role="group" aria-label="Color de acento" className="flex flex-wrap gap-3">
            {theme.accents.map(([name, hex], i) => (
              <button
                key={name}
                type="button"
                aria-pressed={i === accentIdx}
                aria-label={name}
                onClick={() => setAccentIdx(i)}
                className="flex min-w-16 flex-col items-center gap-1.5 rounded-xl p-1.5"
              >
                <span
                  className="block size-11 box-border rounded-full border-[3px] p-[3px]"
                  style={{ borderColor: i === accentIdx ? theme.text : "transparent" }}
                >
                  <span className="block h-full w-full rounded-full" style={{ background: hex }} />
                </span>
                <span className="text-xs text-muted">{name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-[260px] flex-1 flex-col gap-0.5">
            <CardHeading id="h-auto" className="text-lg">
              Seguir el tema del sistema
            </CardHeading>
            <span className="text-sm text-muted">Catppuccin Latte de día y Mocha de noche, según tu dispositivo.</span>
          </div>
          <Switch checked={followSystem} onCheckedChange={setFollowSystem} label="Seguir el tema del sistema" />
        </Card>
      </div>

      <aside aria-label="Vista previa" className="flex min-w-0 flex-[2_1_340px] flex-col gap-4 rounded-card border border-line bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardHeading>Vista previa</CardHeading>
          <span className="text-[13px] text-muted">
            {theme.group === "catppuccin" ? "Catppuccin " : ""}
            {theme.name} · {theme.accents[accentIdx]?.[0]}
          </span>
        </div>
        <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-bg p-4">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[17px] font-bold">Programación</span>
              <span className="font-num rounded-full border border-line px-2.5 py-0.5 text-xs">12,8 %</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-num text-[30px] font-medium text-accent">1.284</span>
              <span className="font-num text-[13px] text-muted">/ 10.000 h</span>
            </div>
            <ProgressBar pct={12.84} ariaLabel="1.284 de 10.000 horas" />
            <div className="flex h-16 items-end gap-1.5">
              {bars.map((b, i) => (
                <span
                  key={i}
                  className="block flex-1 rounded-t"
                  style={{ height: b.h, background: b.isToday ? accent : "color-mix(in srgb, var(--text) 35%, var(--card))" }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-line px-3 text-[13px] font-semibold">
              <span className="size-2 rounded-full bg-accent" />
              Programación
            </span>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-line px-3 text-[13px] font-semibold">
              <span className="size-2 rounded-full bg-a2" />
              Inglés
            </span>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-line px-3 text-[13px] font-semibold">
              <span className="size-2 rounded-full bg-a3" />
              Guitarra
            </span>
          </div>
          <Button className="w-full">Iniciar sesión</Button>
        </div>
        <p className="m-0 text-[13px] text-muted">Tu elección se guarda en tu cuenta y se aplica en todas tus pantallas.</p>
      </aside>
    </div>
  );
}
