"use client";

import { useMemo } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Switch } from "@/components/ui/switch";
import { useOficioTheme } from "@/lib/theme/ThemeProvider";
import { ACCENT_SWATCHES, THEMES, getTheme, resolveAccents, type ThemeDef } from "@/lib/theme/tokens";
import { cn } from "@/lib/cn";

function ThemeCard({ theme, selected, onPick }: { theme: ThemeDef; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className="flex flex-col gap-3 rounded-[14px] border-[3px] p-4 text-left"
      style={{
        borderColor: theme.ink,
        background: theme.paper,
        color: theme.ink,
        boxShadow: selected ? `6px 6px 0 ${theme.a1}` : "none",
      }}
    >
      <span className="flex items-center justify-between text-[18px] font-bold">
        {theme.name} {selected && "✓"}
      </span>
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="size-6.5 rounded-full border-2" style={{ background: theme.a1, borderColor: theme.ink }} />
        <span className="size-6.5 rounded-full border-2" style={{ background: theme.a2, borderColor: theme.ink }} />
        <span className="size-6.5 rounded-full border-2" style={{ background: theme.a3, borderColor: theme.ink }} />
      </span>
    </button>
  );
}

export function AparienciaPanel() {
  const { themeId, accentIdx, followSystem, setTheme, setAccentIdx, setFollowSystem } = useOficioTheme();
  const theme = getTheme(themeId);
  const { a1 } = resolveAccents(theme, accentIdx);

  const catppuccin = THEMES.filter((t) => t.group === "catppuccin");
  const others = THEMES.filter((t) => t.group === "otros");

  const bars = useMemo(() => {
    const vals = [140, 95, 185, 120, 210, 155, 0];
    return vals.map((v, i) => ({ h: Math.max(3, Math.round((v / 210) * 64)), isToday: i === 5 }));
  }, []);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h3 className="label-xs font-bold">Catppuccin</h3>
          <div role="group" aria-label="Temas Catppuccin" className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-5">
            {catppuccin.map((t) => (
              <ThemeCard key={t.id} theme={t} selected={t.id === themeId} onPick={() => setTheme(t.id, null)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="label-xs font-bold">Otros</h3>
          <div role="group" aria-label="Otros temas" className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-5">
            {others.map((t) => (
              <ThemeCard key={t.id} theme={t} selected={t.id === themeId} onPick={() => setTheme(t.id, null)} />
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-4 p-6">
          <CardHeading>Color principal</CardHeading>
          <div role="group" aria-label="Color principal" className="flex flex-wrap gap-3">
            {ACCENT_SWATCHES.map(([name, hex], i) => (
              <button
                key={name}
                type="button"
                aria-pressed={accentIdx === i}
                aria-label={name}
                onClick={() => setAccentIdx(i)}
                className="size-12 rounded-full border-[3px] border-ink p-0"
                style={{ background: hex, boxShadow: accentIdx === i ? "4px 4px 0 var(--shadow)" : "none" }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-3.5">
            <div className="flex-1">
              <div className="font-bold">Seguir el tema del sistema</div>
              <div className="font-num text-[12px]">Latte de día, Mocha de noche</div>
            </div>
            <Switch checked={followSystem} onCheckedChange={setFollowSystem} label="Seguir el tema del sistema" />
          </div>
        </Card>
      </div>

      <aside aria-label="Vista previa" className="bx flex min-w-0 flex-[2_1_340px] flex-col gap-4 p-5" style={{ transform: "rotate(1deg)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardHeading>Vista previa</CardHeading>
          <span className="text-[13px] font-bold">
            {theme.group === "catppuccin" ? "Catppuccin " : ""}
            {theme.name}
          </span>
        </div>
        <div className="bx flex flex-col gap-3.5 p-4" style={{ background: a1 }}>
          <div className="text-[40px] font-bold leading-none tracking-tight">12 días</div>
          <span className="font-bold">seguidos</span>
        </div>
        <div className="flex gap-2.5">
          <span className="bx flex-1 px-3 py-2.5 font-bold" style={{ boxShadow: "4px 4px 0 var(--shadow)", background: "var(--a2)" }}>
            Inglés
          </span>
          <span className="bx flex-1 px-3 py-2.5 font-bold" style={{ boxShadow: "4px 4px 0 var(--shadow)", background: "var(--a3)" }}>
            Guitarra
          </span>
        </div>
        <ProgressBar pct={13} color="var(--ink)" ariaLabel="Vista previa" height={22} />
        <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
          {bars.map((b, i) => (
            <span key={i} className={cn("block flex-1 rounded-t border-2 border-ink")} style={{ height: b.h, background: b.isToday ? a1 : "var(--card)" }} />
          ))}
        </div>
        <p className="m-0 text-[13px] text-muted">Tu elección se guarda en tu cuenta y se aplica en todas tus pantallas.</p>
      </aside>
    </div>
  );
}
